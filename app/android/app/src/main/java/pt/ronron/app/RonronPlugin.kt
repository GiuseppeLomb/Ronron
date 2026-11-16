package pt.ronron.app

import android.content.Context
import android.content.res.AssetFileDescriptor
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.SoundPool
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.annotation.ChecksSdkIntAtLeast
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Ronronar nativo: som pelo canal de multimédia (SoundPool, USAGE_MEDIA) e vibração com amplitude controlada,
 * arrancados na mesma instrução para ficarem sincronizados ciclo a ciclo.
 * Sons em assets/public/sons (copiados pela Capacitor a partir de app/public/sons).
 */
@CapacitorPlugin(name = "Ronron")
class RonronPlugin : Plugin() {
    private val nomes = listOf("curto", "medio", "longo", "abrir", "repouso")
    private lateinit var pool: SoundPool
    private val ids = HashMap<String, Int>()
    private val prontos = HashSet<Int>()
    private val fds = ArrayList<AssetFileDescriptor>()
    private val ativos = ConcurrentHashMap<Int, Float>()   // streamId -> volume atual
    private val nomeDe = ConcurrentHashMap<Int, String>()  // streamId -> som
    private val h = Handler(Looper.getMainLooper())
    private val registo = ArrayDeque<String>()
    private var ultimaReproducao: JSObject? = null
    private lateinit var vib: Vibrator
    private lateinit var audio: AudioManager

    override fun load() {
        audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        vib = if (Build.VERSION.SDK_INT >= 31)
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        else @Suppress("DEPRECATION") (context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator)

        pool = SoundPool.Builder().setMaxStreams(4).setAudioAttributes(
            AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
        ).build()
        pool.setOnLoadCompleteListener { _, id, estado ->
            if (estado == 0) prontos.add(id)
            anotar("som ${ids.entries.firstOrNull { it.value == id }?.key ?: id} carregado (estado $estado)")
        }
        for (n in nomes) {
            try {
                val fd = context.assets.openFd("public/sons/ronron-$n.ogg"); fds.add(fd)
                ids[n] = pool.load(fd, 1)
            } catch (e: Exception) { anotar("ERRO a abrir ronron-$n.ogg: ${e.message}") }
        }
        anotar("plugin pronto · Android ${Build.VERSION.SDK_INT} · ${Build.MANUFACTURER} ${Build.MODEL}")
    }

    override fun handleOnDestroy() { try { pool.release(); fds.forEach { it.close() } } catch (_: Exception) {} }

    private fun anotar(t: String) {
        val l = SimpleDateFormat("HH:mm:ss.SSS", Locale.US).format(Date()) + "  " + t
        synchronized(registo) { registo.addLast(l); while (registo.size > 60) registo.removeFirst() }
    }

    // ---------------- som ----------------
    private fun volumeEm(stream: Int, alvo: Float, ms: Long, depois: (() -> Unit)? = null) {
        val de = ativos[stream] ?: 0f; val passos = max(1L, ms / 30L).toInt(); var i = 0
        val r = object : Runnable { override fun run() {
            i++; val v = de + (alvo - de) * (i.toFloat() / passos)
            pool.setVolume(stream, v, v); ativos[stream] = v
            if (i < passos) h.postDelayed(this, 30) else depois?.invoke()
        } }
        h.post(r)
    }

    @PluginMethod
    fun tocar(call: PluginCall) {
        val nome = call.getString("som") ?: return call.reject("falta som")
        val vol = (call.getDouble("volume") ?: 0.8).toFloat().coerceIn(0f, 1f)
        val loop = call.getBoolean("loop") ?: false
        val maxMs = (call.getInt("maxMs") ?: 20000).toLong()
        val entrada = (call.getInt("fadeInMs") ?: 0).toLong()
        val id = ids[nome]
        val res = JSObject()
        res.put("som", nome); res.put("carregado", id != null && prontos.contains(id))
        res.put("volumeMedia", audio.getStreamVolume(AudioManager.STREAM_MUSIC)); res.put("volumeMediaMax", audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
        var stream = 0
        if (id != null && prontos.contains(id)) {
            stream = pool.play(id, if (entrada > 0) 0f else vol, if (entrada > 0) 0f else vol, 1, if (loop) -1 else 0, 1f)
            if (stream != 0) {
                ativos[stream] = if (entrada > 0) 0f else vol; nomeDe[stream] = nome
                if (entrada > 0) volumeEm(stream, vol, entrada)
                if (loop) h.postDelayed({ pararStream(stream, 2500) }, maxMs)
            }
        }
        res.put("stream", stream); res.put("tocou", stream != 0)
        anotar("tocar $nome vol=${"%.2f".format(vol)} → ${if (stream != 0) "a tocar (stream $stream)" else "NÃO tocou"} · volume multimédia ${res.getInteger("volumeMedia")}/${res.getInteger("volumeMediaMax")}")
        // vibração arranca na mesma instrução que o som
        call.getArray("env")?.let { env -> if (env.length() > 0) vibrarEnvolvente(call, env) }
        res.put("t", SystemClock.uptimeMillis()); ultimaReproducao = res
        call.resolve(res)
    }

    private fun pararStream(s: Int, ms: Long) { if (!ativos.containsKey(s)) return; volumeEm(s, 0f, ms) { pool.stop(s); ativos.remove(s); nomeDe.remove(s) } }

    @PluginMethod
    fun parar(call: PluginCall) {
        val ms = (call.getInt("fadeMs") ?: 300).toLong()
        val so = call.getString("som")   // só esse som (ex.: "repouso"), ou todos
        ativos.keys.toList().filter { so == null || nomeDe[it] == so }.forEach { pararStream(it, ms) }
        if (call.getBoolean("vibracao") != false) vib.cancel()
        anotar("parar ${so ?: "tudo"}")
        call.resolve()
    }

    // ---------------- vibração ----------------
    @ChecksSdkIntAtLeast(api = 31)
    private fun lowTickOk() = Build.VERSION.SDK_INT >= 31 && vib.areAllPrimitivesSupported(VibrationEffect.Composition.PRIMITIVE_LOW_TICK)
    @ChecksSdkIntAtLeast(api = 26)
    private fun podeAmplitude() = Build.VERSION.SDK_INT >= 26 && vib.hasAmplitudeControl()

    @PluginMethod
    fun vibrar(call: PluginCall) {
        val env = call.getArray("env") ?: return call.reject("falta env")
        vibrarEnvolvente(call, env); call.resolve()
    }

    /** Variantes: A = segue o som (forma de onda contínua), B = onda de respiração 1,3 s, C = textura de LOW_TICK. */
    private fun vibrarEnvolvente(call: PluginCall, envJs: JSArray) {
        if (!vib.hasVibrator()) { anotar("sem motor de vibração"); return }
        val env = DoubleArray(envJs.length()) { envJs.optDouble(it, 0.0).coerceIn(0.0, 1.0) }
        val passo = (call.getInt("passoMs") ?: 20).toLong()
        val variante = call.getString("variante") ?: "A"
        val forca = (call.getDouble("intensidade") ?: 1.0).coerceIn(0.1, 1.0)
        val atraso = (call.getInt("atrasoMs") ?: 0).toLong()
        val saida = (call.getInt("saidaMs") ?: 160).toDouble()   // a vibração apaga-se com o fade-out do som
        val lo = 0.20 * forca; val hi = 0.35 * forca             // 20-35% da força do motor
        val dur = env.size * passo
        val efeito: VibrationEffect? = when {
            variante == "C" && lowTickOk() -> {
                val c = VibrationEffect.startComposition(); var t = 0L; val pausa = 34
                while (t < dur) {
                    val e = env[min(env.size - 1, (t / passo).toInt())]
                    val r = min(1.0, (dur - t) / saida)
                    c.addPrimitive(VibrationEffect.Composition.PRIMITIVE_LOW_TICK, ((0.18 + 0.55 * e * forca) * r).toFloat().coerceIn(0.05f, 1f), if (t == 0L) 0 else pausa)
                    t += pausa
                }
                c.compose()
            }
            podeAmplitude() -> {
                val n = env.size; val tempos = LongArray(n) { passo }
                val amps = IntArray(n) { i ->
                    val tt = i * passo / 1000.0
                    val e = if (variante == "B") 0.5 - 0.5 * cos(2 * PI * tt / 1.3) else env[i]
                    val rampa = min(1.0, min(i / 5.0, (n - 1 - i) * passo / saida))   // entra em 100 ms, sai com o som
                    max(1, ((lo + (hi - lo) * e) * 255 * rampa).roundToInt())
                }
                amps[n - 1] = 0
                VibrationEffect.createWaveform(tempos, amps, -1)
            }
            else -> null
        }
        val corre = {
            if (efeito != null && Build.VERSION.SDK_INT >= 26) vib.vibrate(efeito) else vibrarLeveSemAmplitude(env, passo)
        }
        if (atraso > 0) h.postDelayed(corre, atraso) else corre()
        anotar("vibrar variante $variante · ${dur} ms · ${if (efeito != null) (if (variante == "C" && lowTickOk()) "composição LOW_TICK" else "forma de onda com amplitude") else "versão leve (sem controlo de amplitude)"}")
    }

    /** Sem controlo de amplitude: um tique muito curto em cada pico de respiração. */
    private fun vibrarLeveSemAmplitude(env: DoubleArray, passo: Long) {
        var ultimo = -1000L
        for (i in 1 until env.size - 1) {
            if (env[i] > 0.6 && env[i] >= env[i - 1] && env[i] >= env[i + 1] && i * passo - ultimo > 450) {
                ultimo = i * passo
                h.postDelayed({ tiqueBase() }, ultimo)
            }
        }
    }
    private fun tiqueBase() {
        if (Build.VERSION.SDK_INT >= 29) vib.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK))
        else if (Build.VERSION.SDK_INT >= 26) vib.vibrate(VibrationEffect.createOneShot(6, VibrationEffect.DEFAULT_AMPLITUDE))
        else @Suppress("DEPRECATION") vib.vibrate(6)
    }

    /** Toque único muito leve (passar, desfazer, erro, interruptores). Nunca o padrão de notificação. */
    @PluginMethod
    fun toque(call: PluginCall) {
        if (!vib.hasVibrator()) return call.resolve()
        val medio = call.getString("forca") == "medio"
        when {
            lowTickOk() -> vib.vibrate(VibrationEffect.startComposition().addPrimitive(
                if (medio) VibrationEffect.Composition.PRIMITIVE_TICK else VibrationEffect.Composition.PRIMITIVE_LOW_TICK, if (medio) 0.5f else 0.7f).compose())
            podeAmplitude() -> vib.vibrate(VibrationEffect.createOneShot(if (medio) 14L else 10L, if (medio) 70 else 45))
            else -> tiqueBase()
        }
        call.resolve()
    }

    // ---------------- diagnóstico (ecrã de testes) ----------------
    @PluginMethod
    fun estado(call: PluginCall) {
        val r = JSObject()
        r.put("aparelho", "${Build.MANUFACTURER} ${Build.MODEL}"); r.put("android", Build.VERSION.SDK_INT)
        r.put("volumeMedia", audio.getStreamVolume(AudioManager.STREAM_MUSIC)); r.put("volumeMediaMax", audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
        r.put("modoToque", when (audio.ringerMode) { AudioManager.RINGER_MODE_SILENT -> "silêncio"; AudioManager.RINGER_MODE_VIBRATE -> "vibrar"; else -> "normal" })
        r.put("musicaAtiva", audio.isMusicActive)
        val saidas = audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS).map { when (it.type) {
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "altifalante"; AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "auricular"
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET -> "auscultadores"
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "bluetooth"; AudioDeviceInfo.TYPE_USB_HEADSET -> "USB"; else -> "tipo ${it.type}" } }.distinct()
        r.put("saidas", JSArray(saidas))
        val sons = JSObject(); nomes.forEach { n -> sons.put(n, ids[n]?.let { prontos.contains(it) } ?: false) }; r.put("sonsCarregados", sons)
        r.put("temVibrador", vib.hasVibrator()); r.put("controloAmplitude", podeAmplitude())
        r.put("lowTick", lowTickOk())
        if (Build.VERSION.SDK_INT >= 30) r.put("composicao", vib.areAllPrimitivesSupported(VibrationEffect.Composition.PRIMITIVE_TICK))
        r.put("ultimaReproducao", ultimaReproducao)
        r.put("registo", JSArray(synchronized(registo) { registo.toList() }))
        call.resolve(r)
    }
}
