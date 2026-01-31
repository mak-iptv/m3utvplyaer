import 'dart:convert';
import 'package:http/http.dart' as http;

class M3UParser {
  Future<List<Channel>> parseFromUrl(String url) async {
    final response = await http.get(Uri.parse(url));
    
    if (response.statusCode == 200) {
      return parseContent(response.body);
    } else {
      throw Exception('Failed to load M3U file');
    }
  }
  
  List<Channel> parseContent(String content) {
    final lines = content.split('\n');
    final List<Channel> channels = [];
    
    Channel? currentChannel;
    
    for (var line in lines) {
      line = line.trim();
      
      if (line.startsWith('#EXTINF:')) {
        // Parse channel info
        final channel = _parseExtinf(line);
        if (channel != null) {
          currentChannel = channel;
        }
      } else if (line.isNotEmpty && !line.startsWith('#') && currentChannel != null) {
        // This is the URL for the current channel
        channels.add(Channel(
          name: currentChannel.name,
          url: line,
          group: currentChannel.group,
          logo: currentChannel.logo,
        ));
        currentChannel = null;
      }
    }
    
    return channels;
  }
  
  Channel? _parseExtinf(String line) {
    try {
      // Remove #EXTINF:
      line = line.substring(8);
      
      // Find the comma separating duration and name
      final commaIndex = line.indexOf(',');
      if (commaIndex == -1) return null;
      
      // Get channel name
      final name = line.substring(commaIndex + 1).trim();
      
      // Parse attributes before the comma
      final attributes = line.substring(0, commaIndex);
      
      String? group;
      String? logo;
      
      // Look for group-title
      final groupMatch = RegExp(r'group-title="([^"]+)"').firstMatch(attributes);
      if (groupMatch != null) {
        group = groupMatch.group(1);
      }
      
      // Look for tvg-logo
      final logoMatch = RegExp(r'tvg-logo="([^"]+)"').firstMatch(attributes);
      if (logoMatch != null) {
        logo = logoMatch.group(1);
      }
      
      return Channel(name: name, url: '', group: group, logo: logo);
    } catch (e) {
      return null;
    }
  }
}