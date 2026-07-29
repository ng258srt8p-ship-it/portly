import Foundation
import AppKit
import SwiftUI

@MainActor
class MenuBarController {
    private let statusItem: NSStatusItem
    private var popover: NSPopover?
    
    init() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        setupMenuBarItem()
    }
    
    private func setupMenuBarItem() {
        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "radar", accessibilityDescription: "NIM Radar")
            button.action = #selector(togglePopover)
            button.target = self
        }
    }
    
    @objc private func togglePopover() {
        if let popover = popover {
            popover.close()
            self.popover = nil
        } else {
            showPopover()
        }
    }
    
    private func showPopover() {
        let popover = NSPopover()
        popover.contentViewController = NSHostingController(rootView: PreferencesView())
        popover.behavior = .transient
        
        if let button = statusItem.button {
            popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        }
        self.popover = popover
    }
}