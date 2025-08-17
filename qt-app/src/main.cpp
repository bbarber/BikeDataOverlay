#include <QApplication>
#include <QDebug>
#include "mainwindow.h"

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    
    app.setApplicationName("Bike Data Overlay");
    app.setApplicationVersion("1.0");
    app.setOrganizationName("BikeData");
    app.setOrganizationDomain("bikedata.com");

    qDebug() << "Starting Bike Data Overlay application";
    qDebug() << "Qt version:" << QT_VERSION_STR;

    MainWindow window;
    window.show();

    return app.exec();
}