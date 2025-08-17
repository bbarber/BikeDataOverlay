# Frameless Window Features

## Overview

The Bike Data Overlay MAUI application now supports frameless windows similar to Electron apps, providing a sleek overlay experience perfect for cycling data display.

## ✅ Implemented Features

### 🪟 **Frameless Window Design**
- **Custom Title Bar**: Replaced standard OS window decorations
- **Borderless**: Clean overlay appearance without system chrome
- **Always On Top**: Window stays above other applications (perfect for cycling overlays)
- **Transparent Background**: Seamless integration with desktop

### 🎛️ **Window Controls**
- **Drag Handle**: Custom title bar for moving the window around
- **Close Button**: ✕ to exit the application
- **Minimize Button**: − to collapse window to title bar only
- **Double-click to Toggle**: Double-click title bar to minimize/restore

### 📐 **Window Management**
- **Draggable**: Pan gesture on title bar to move window
- **Resizable**: Window can be resized programmatically
- **Positioning**: Remembers window position
- **Size Control**: Customizable window dimensions

## 🔧 Technical Implementation

### Platform-Specific Code

#### **macOS (Mac Catalyst)**
```csharp
// Set window level above normal windows
uiWindow.WindowLevel = UIKit.UIWindowLevel.StatusBar + 1;
```

#### **Windows**
```csharp
// Remove window decorations using Win32 API
var style = GetWindowLong(hwnd, GWL_STYLE);
style &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU);
SetWindowLong(hwnd, GWL_STYLE, style);

// Make window topmost
SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED);
```

### Custom Title Bar UI
```xml
<!-- Custom drag handle with controls -->
<Border Grid.Row="0" BackgroundColor="#2a2a2a">
    <Grid>
        <Label Text="🚴‍♂️ Bike Data Overlay" />
        <Button Text="−" Clicked="OnMinimizeClicked" />
        <Button Text="✕" Clicked="OnCloseClicked" />
    </Grid>
    <Border.GestureRecognizers>
        <PanGestureRecognizer PanUpdated="OnDragHandlePanUpdated"/>
        <TapGestureRecognizer NumberOfTapsRequired="2" Tapped="OnDragHandleDoubleTapped"/>
    </Border.GestureRecognizers>
</Border>
```

## 🎮 User Controls

### **Moving the Window**
- Click and drag the title bar to reposition the overlay

### **Minimizing/Restoring**
- Click the **−** button to minimize to title bar only
- Click the **−** button again or double-click title bar to restore
- Double-click the title bar to toggle minimize/restore

### **Closing**
- Click the **✕** button to exit the application

### **Window Size**
- Initial size: 400×800 pixels
- Position: 100,100 from top-left
- Minimized height: 35 pixels (title bar only)

## 🔄 Window Service

A dedicated `IWindowService` manages window operations:

```csharp
public interface IWindowService
{
    void SetWindowPosition(double x, double y);
    void SetWindowSize(double width, double height);
    void SetAlwaysOnTop(bool alwaysOnTop);
    (double X, double Y) GetWindowPosition();
    (double Width, double Height) GetWindowSize();
}
```

## 🎨 Visual Design

### **Title Bar**
- **Background**: Dark gray (#2a2a2a)
- **Border**: Subtle border (#444)
- **Height**: 30 pixels
- **Rounded corners**: Top corners only

### **Window Appearance**
- **Transparent background**: Seamless overlay
- **Rounded borders**: Modern appearance
- **Dark theme**: Perfect for cycling environments
- **Compact layout**: Minimal screen space usage

## 🚀 Benefits Over Standard Windows

1. **True Overlay Experience**: No window decorations interfere with content
2. **Always Visible**: Stays on top of other applications
3. **Cycling-Optimized**: Designed for split-screen cycling apps (Zwift, TrainerRoad, etc.)
4. **Customizable**: Full control over window behavior
5. **Cross-Platform**: Same experience on macOS and Windows

## 🔮 Future Enhancements

- **Snap to Edges**: Magnetic window positioning
- **Multiple Monitor Support**: Smart positioning across displays
- **Transparency Control**: Adjustable window opacity
- **Hotkey Support**: Keyboard shortcuts for window control
- **Save Window State**: Remember position and size across app restarts

## 🏁 Perfect for Cycling

This frameless window implementation makes the Bike Data Overlay perfect for:
- **Indoor Cycling**: Overlay on Zwift, TrainerRoad, etc.
- **Multi-Screen Setups**: Position anywhere on desktop
- **Minimal Distraction**: Clean, borderless design
- **Always Accessible**: Never hidden behind other windows

The frameless window feature brings the BikeDataOverlay MAUI app to parity with modern overlay applications while providing the benefits of native .NET performance! 🚴‍♂️✨