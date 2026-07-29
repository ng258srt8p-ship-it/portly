import SwiftUI

struct PreferencesView: View {
    var body: some View {
        Form {
            Section(header: Text("NIM Radar Settings")) {
                Toggle("Enable Radar", isOn: .constant(true))
                Picker("Model", selection: .constant(0)) {
                    Text("NIM Model 1").tag(0)
                    Text("NIM Model 2").tag(1)
                }
                Slider(value: .constant(0.5), in: 0...1) {
                    Text("Confidence Threshold")
                }
            }
        }
        .frame(width: 300, height: 200)
        .padding()
    }
}