import 'package:flutter/material.dart';
import 'package:m3u_player/screens/player_screen.dart';
import 'package:m3u_player/services/playlist_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:fluttertoast/fluttertoast.dart';

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final PlaylistService _playlistService = PlaylistService();
  List<dynamic> _playlists = [];
  bool _isLoading = true;
  String _deviceKey = '';

  @override
  void initState() {
    super.initState();
    _loadDeviceKey();
    _loadPlaylists();
  }

  Future<void> _loadDeviceKey() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _deviceKey = prefs.getString('device_key') ?? '';
    });
  }

  Future<void> _loadPlaylists() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final playlists = await _playlistService.getPlaylists();
      setState(() {
        _playlists = playlists;
      });
    } catch (e) {
      Fluttertoast.showToast(msg: 'Error loading playlists: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _addNewPlaylist() {
    showDialog(
      context: context,
      builder: (context) => AddPlaylistDialog(
        onAdd: (name, url) async {
          try {
            await _playlistService.addPlaylist(name, url);
            await _loadPlaylists();
            Fluttertoast.showToast(msg: 'Playlist added successfully!');
          } catch (e) {
            Fluttertoast.showToast(msg: 'Error: $e');
          }
        },
      ),
    );
  }

  void _playPlaylist(String url, String name) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PlayerScreen(m3uUrl: url, playlistName: name),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('M3U Player'),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadPlaylists,
          ),
          PopupMenuButton(
            itemBuilder: (context) => [
              PopupMenuItem(
                child: Text('Device Info'),
                value: 'info',
              ),
              PopupMenuItem(
                child: Text('Logout'),
                value: 'logout',
              ),
            ],
            onSelected: (value) {
              if (value == 'info') {
                _showDeviceInfo();
              } else if (value == 'logout') {
                _logout();
              }
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addNewPlaylist,
        child: Icon(Icons.add),
        tooltip: 'Add Playlist',
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _playlists.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.playlist_play, size: 80, color: Colors.grey),
                      SizedBox(height: 20),
                      Text(
                        'No Playlists Found',
                        style: TextStyle(fontSize: 18, color: Colors.grey),
                      ),
                      SizedBox(height: 10),
                      Text(
                        'Tap the + button to add your first playlist',
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: EdgeInsets.all(10),
                  itemCount: _playlists.length,
                  itemBuilder: (context, index) {
                    final playlist = _playlists[index];
                    return Card(
                      margin: EdgeInsets.symmetric(vertical: 5),
                      child: ListTile(
                        leading: Icon(Icons.live_tv, color: Colors.blue),
                        title: Text(playlist['name']),
                        subtitle: Text(
                          playlist['m3u_url'],
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: Icon(Icons.play_arrow),
                              onPressed: () => _playPlaylist(
                                playlist['m3u_url'],
                                playlist['name'],
                              ),
                            ),
                            IconButton(
                              icon: Icon(Icons.delete, color: Colors.red),
                              onPressed: () {
                                // TODO: Implement delete
                              },
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  void _showDeviceInfo() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Device Information'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Device Key:'),
            SelectableText(
              _deviceKey.substring(0, 20) + '...',
              style: TextStyle(fontFamily: 'Monospace'),
            ),
            SizedBox(height: 10),
            Text('Playlists: ${_playlists.length}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Close'),
          ),
        ],
      ),
    );
  }

  void _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('device_key');
    Navigator.pushReplacementNamed(context, '/activation');
  }
}

class AddPlaylistDialog extends StatefulWidget {
  final Function(String, String) onAdd;

  AddPlaylistDialog({required this.onAdd});

  @override
  _AddPlaylistDialogState createState() => _AddPlaylistDialogState();
}

class _AddPlaylistDialogState extends State<AddPlaylistDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _urlController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Add New Playlist'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'Playlist Name',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a name';
                }
                return null;
              },
            ),
            SizedBox(height: 10),
            TextFormField(
              controller: _urlController,
              decoration: InputDecoration(
                labelText: 'M3U URL',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a URL';
                }
                if (!value.startsWith('http')) {
                  return 'Please enter a valid URL';
                }
                return null;
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              widget.onAdd(_nameController.text, _urlController.text);
              Navigator.pop(context);
            }
          },
          child: Text('Add'),
        ),
      ],
    );
  }
}