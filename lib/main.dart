import 'package:flutter/material.dart';
import 'package:m3u_player/screens/home_screen.dart';
import 'package:m3u_player/screens/activation_screen.dart';
import 'package:m3u_player/services/device_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'M3U Player',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: FutureBuilder(
        future: _checkIfActivated(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return SplashScreen();
          }
          
          if (snapshot.hasData && snapshot.data == true) {
            return HomeScreen();
          } else {
            return ActivationScreen();
          }
        },
      ),
    );
  }
  
  Future<bool> _checkIfActivated() async {
    final prefs = await SharedPreferences.getInstance();
    final deviceKey = prefs.getString('device_key');
    return deviceKey != null && deviceKey.isNotEmpty;
  }
}

class SplashScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blue,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.tv, size: 100, color: Colors.white),
            SizedBox(height: 20),
            Text(
              'M3U Player',
              style: TextStyle(
                fontSize: 32,
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 10),
            CircularProgressIndicator(color: Colors.white),
          ],
        ),
      ),
    );
  }
}