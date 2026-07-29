import SwiftUI

@main
struct NimRadarMenuBarApp: App {
    var body: some Scene {
        MenuBarExtra("NIM Radar", systemImage: "radar") {
            ContentView()
        }
        .menuBarExtraStyle(.window)
    }
}

struct ContentView: View {
    var body: some View {
        Text("NIM Radar Menu Bar")
            .padding()
    }
}