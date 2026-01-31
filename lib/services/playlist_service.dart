import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class PlaylistService {
  static const String BASE_URL = 'https://mastor-naste.yzz.me/api';
  
  Future<List<dynamic>> getPlaylists() async {
    final prefs = await SharedPreferences.getInstance();
    final deviceKey = prefs.getString('device_key');
    
    if (deviceKey == null) {
      throw Exception('Device not activated');
    }
    
    final response = await http.get(
      Uri.parse('$BASE_URL/playlists.php?device_key=$deviceKey'),
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load playlists');
    }
  }
  
  Future<void> addPlaylist(String name, String url) async {
    final prefs = await SharedPreferences.getInstance();
    final deviceKey = prefs.getString('device_key');
    
    if (deviceKey == null) {
      throw Exception('Device not activated');
    }
    
    final response = await http.post(
      Uri.parse('$BASE_URL/playlists.php'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'device_key': deviceKey,
        'name': name,
        'm3u_url': url,
      }),
    );
    
    if (response.statusCode != 201) {
      throw Exception('Failed to add playlist');
    }
  }
}