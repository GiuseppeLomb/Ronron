package pt.ronron.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RonronPlugin.class);   // ronronar nativo: som + vibração
        super.onCreate(savedInstanceState);
    }
}
