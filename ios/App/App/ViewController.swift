import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Debug: Print Capacitor configuration
        print("🔍 Capacitor Bridge loaded")
        print("🔍 Start path: \(self.bridge?.config.serverURL?.absoluteString ?? "nil")")

        // Enable web view debugging
        if #available(iOS 16.4, *) {
            self.webView?.isInspectable = true
        }

        // Log when page loads
        self.webView?.configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
}
