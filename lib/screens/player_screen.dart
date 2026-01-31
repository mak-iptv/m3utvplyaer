import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';
import 'package:m3u_player/services/m3u_parser.dart';
import 'package:fluttertoast/fluttertoast.dart';

class PlayerScreen extends StatefulWidget {
  final String m3uUrl;
  final String playlistName;

  PlayerScreen({required this.m3uUrl, required this.playlistName});

  @override
  _PlayerScreenState createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  List<Channel> _channels = [];
  bool _isLoading = true;
  ChewieController? _chewieController;
  VideoPlayerController? _videoPlayerController;
  int _currentChannelIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadPlaylist();
  }

  @override
  void dispose() {
    _videoPlayerController?.dispose();
    _chewieController?.dispose();
    super.dispose();
  }

  Future<void> _loadPlaylist() async {
    try {
      final parser = M3UParser();
      final channels = await parser.parseFromUrl(widget.m3uUrl);
      
      setState(() {
        _channels = channels;
        _isLoading = false;
      });
      
      if (channels.isNotEmpty) {
        _playChannel(0);
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Error loading playlist: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _playChannel(int index) async {
    if (index < 0 || index >= _channels.length) return;
    
    setState(() {
      _currentChannelIndex = index;
    });

    // Dispose previous controllers
    _videoPlayerController?.dispose();
    _chewieController?.dispose();

    try {
      final channel = _channels[index];
      
      _videoPlayerController = VideoPlayerController.network(channel.url);
      await _videoPlayerController!.initialize();

      _chewieController = ChewieController(
        videoPlayerController: _videoPlayerController!,
        autoPlay: true,
        looping: false,
        allowFullScreen: true,
        fullScreenByDefault: false,
        materialProgressColors: ChewieProgressColors(
          playedColor: Colors.red,
          handleColor: Colors.red,
          backgroundColor: Colors.grey,
          bufferedColor: Colors.grey.shade300,
        ),
        placeholder: Container(
          color: Colors.black,
          child: Center(
            child: CircularProgressIndicator(),
          ),
        ),
        errorBuilder: (context, errorMessage) {
          return Center(
            child: Text(
              'Error loading channel',
              style: TextStyle(color: Colors.white),
            ),
          );
        },
      );

      setState(() {});
    } catch (e) {
      Fluttertoast.showToast(msg: 'Error playing channel: $e');
    }
  }

  void _nextChannel() {
    if (_currentChannelIndex < _channels.length - 1) {
      _playChannel(_currentChannelIndex + 1);
    }
  }

  void _previousChannel() {
    if (_currentChannelIndex > 0) {
      _playChannel(_currentChannelIndex - 1);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.playlistName),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _channels.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error, size: 60, color: Colors.grey),
                      SizedBox(height: 20),
                      Text('No channels found in playlist'),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Player
                    Expanded(
                      child: _chewieController != null &&
                              _chewieController!.videoPlayerController.value.isInitialized
                          ? Chewie(controller: _chewieController!)
                          : Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  CircularProgressIndicator(),
                                  SizedBox(height: 20),
                                  Text('Loading channel...'),
                                ],
                              ),
                            ),
                    ),
                    
                    // Channel Info
                    Container(
                      padding: EdgeInsets.all(10),
                      color: Colors.black87,
                      child: Row(
                        children: [
                          Icon(Icons.tv, color: Colors.white),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _channels[_currentChannelIndex].name,
                              style: TextStyle(color: Colors.white),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            '${_currentChannelIndex + 1}/${_channels.length}',
                            style: TextStyle(color: Colors.white70),
                          ),
                        ],
                      ),
                    ),
                    
                    // Channel List
                    Container(
                      height: 200,
                      child: ListView.builder(
                        itemCount: _channels.length,
                        itemBuilder: (context, index) {
                          final channel = _channels[index];
                          return ListTile(
                            leading: Icon(
                              Icons.live_tv,
                              color: index == _currentChannelIndex
                                  ? Colors.red
                                  : Colors.grey,
                            ),
                            title: Text(
                              channel.name,
                              style: TextStyle(
                                fontWeight: index == _currentChannelIndex
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                              ),
                            ),
                            subtitle: Text(
                              channel.group ?? 'No category',
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: IconButton(
                              icon: Icon(Icons.favorite_border),
                              onPressed: () {
                                // TODO: Add to favorites
                              },
                            ),
                            onTap: () => _playChannel(index),
                          );
                        },
                      ),
                    ),
                  ],
                ),
      floatingActionButton: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            heroTag: 'prev',
            onPressed: _previousChannel,
            child: Icon(Icons.skip_previous),
            mini: true,
          ),
          SizedBox(width: 10),
          FloatingActionButton(
            heroTag: 'next',
            onPressed: _nextChannel,
            child: Icon(Icons.skip_next),
            mini: true,
          ),
        ],
      ),
    );
  }
}

class Channel {
  final String name;
  final String url;
  final String? group;
  final String? logo;

  Channel({
    required this.name,
    required this.url,
    this.group,
    this.logo,
  });
}