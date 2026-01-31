import 'dart:convert';
import 'package:device_info/device_info.dart';
import 'package:package_info/package_info.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

class DeviceService {
  static const String BASE_URL = 'https://mastor-naste.yzz.me/api';
  
  Future<String> generateActivationCode() async {
    DeviceInfoPlugin deviceInfo = DeviceInfoPlugin();
    PackageInfo packageInfo = await PackageInfo.fromPlatform();
    
    String deviceId;
    String platform;
    
    if (await deviceInfo.androidInfo != null) {
      AndroidDeviceInfo androidInfo = await deviceInfo.androidInfo;
      deviceId = androidInfo.androidId;
      platform = 'Android ${androidInfo.version.release}';
    } else if (await deviceInfo.iosInfo != null) {
      IosDeviceInfo iosInfo = await deviceInfo.iosInfo;
      deviceId = iosInfo.identifierForVendor ?? 'unknown_ios';
      platform = 'iOS ${iosInfo.systemVersion}';
    } else {
      deviceId = 'unknown_${DateTime.now().millisecondsSinceEpoch}';
      platform = 'Unknown';
    }
    
    final deviceData = {
      'device_id': deviceId,
      'platform': platform,
      'app_version': packageInfo.version,
      'app_name': packageInfo.appName,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
    
    final jsonString = jsonEncode(deviceData);
    final encoded = base64Encode(utf8.encode(jsonString));
    
    return encoded;
  }
  
  Future<Map<String, dynamic>> activateDevice(String activationCode) async {
    final response = await http.post(
      Uri.parse('$BASE_URL/activate.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'activation_code': activationCode}),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['success']) {
        await saveDeviceKey(data['device_key']);
      }
      return data;
    } else {
      throw Exception('Failed to activate device');
    }
  }
  
  Future<void> saveDeviceKey(String deviceKey) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('device_key', deviceKey);
  }
  
  Future<String?> getDeviceKey() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('device_key');
  }
  
  Future<bool> verifyDevice() async {
    final deviceKey = await getDeviceKey();
    
    if (deviceKey == null) return false;
    
    try {
      final response = await http.post(
        Uri.parse('$BASE_URL/verify.php'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'device_key': deviceKey}),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['success'] == true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}