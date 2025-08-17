cmake_minimum_required(VERSION 3.26)
project(BikeDataOverlay VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 REQUIRED COMPONENTS Core Widgets Bluetooth Quick)

qt_standard_project_setup()

# Sources
set(SOURCES
    src/main.cpp
    src/mainwindow.cpp
    src/bluetooth/bluetoothmanager.cpp
    src/bluetooth/fitnessdevice.cpp
    src/bluetooth/ftmsprotocol.cpp
    src/overlay/overlaywindow.cpp
    src/models/cyclingmetrics.cpp
)

# Headers
set(HEADERS
    src/mainwindow.h
    src/bluetooth/bluetoothmanager.h
    src/bluetooth/fitnessdevice.h
    src/bluetooth/ftmsprotocol.h
    src/overlay/overlaywindow.h
    src/models/cyclingmetrics.h
)

# Create executable
qt_add_executable(BikeDataOverlay ${SOURCES} ${HEADERS})

# Link Qt modules
target_link_libraries(BikeDataOverlay PRIVATE
    Qt6::Core
    Qt6::Widgets
    Qt6::Bluetooth
    Qt6::Quick
)

# Include directories
target_include_directories(BikeDataOverlay PRIVATE src)

# Set target properties for macOS
if(APPLE)
    set_target_properties(BikeDataOverlay PROPERTIES
        MACOSX_BUNDLE TRUE
        MACOSX_BUNDLE_GUI_IDENTIFIER com.bikedata.overlay
        MACOSX_BUNDLE_BUNDLE_VERSION ${PROJECT_VERSION}
        MACOSX_BUNDLE_SHORT_VERSION_STRING ${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}
        MACOSX_BUNDLE_INFO_PLIST ${CMAKE_CURRENT_SOURCE_DIR}/Info.plist
    )
endif()