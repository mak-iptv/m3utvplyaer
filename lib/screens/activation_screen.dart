import 'package:flutter/material.dart';
import 'package:m3u_player/services/device_service.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:fluttertoast/fluttertoast.dart';

class ActivationScreen extends StatefulWidget {
  @override
  _ActivationScreenState createState() => _ActivationScreenState();
}

class _ActivationScreenState extends State<ActivationScreen> {
  final DeviceService _deviceService = DeviceService();
  bool _isLoading = false;
  String _activationCode = '';
  String _statusMessage = '';

  @override
  void initState() {
    super.initState();
    _generateActivationCode();
  }

  Future<void> _generateActivationCode() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final code = await _deviceService.generateActivationCode();
      setState(() {
        _activationCode = code;
        _statusMessage = 'Activation code generated successfully!';
      });
    } catch (e) {
      setState(() {
        _statusMessage = 'Error generating code: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _activateDevice() async {
    setState(() {
      _isLoading = true;
      _statusMessage = 'Activating device...';
    });

    try {
      final result = await _deviceService.activateDevice(_activationCode);
      
      if (result['success']) {
        Fluttertoast.showToast(
          msg: 'Device activated successfully!',
          toastLength: Toast.LENGTH_LONG,
          gravity: ToastGravity.BOTTOM,
        );
        
        // Navigate to home screen
        Navigator.pushReplacementNamed(context, '/home');
      } else {
        setState(() {
          _statusMessage = 'Activation failed: ${result['message']}';
        });
      }
    } catch (e) {
      setState(() {
        _statusMessage = 'Error: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _openActivationWebsite() async {
    final url = 'https://mastor-naste.yzz.me/admin/dashboard.php';
    if (await canLaunch(url)) {
      await launch(url);
    } else {
      Fluttertoast.showToast(msg: 'Cannot open website');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Device Activation'),
        backgroundColor: Colors.blue,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.device_hub, size: 80, color: Colors.blue),
            SizedBox(height: 20),
            
            Text(
              'Activate Your Device',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            
            SizedBox(height: 10),
            
            Text(
              'Follow these steps to activate your device:',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            
            SizedBox(height: 30),
            
            Card(
              elevation: 5,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    ListTile(
                      leading: Icon(Icons.looks_one, color: Colors.blue),
                      title: Text('Copy your activation code'),
                      subtitle: _isLoading 
                          ? LinearProgressIndicator()
                          : Text(_activationCode, style: TextStyle(fontFamily: 'Monospace')),
                    ),
                    
                    ListTile(
                      leading: Icon(Icons.looks_two, color: Colors.blue),
                      title: Text('Go to activation website'),
                      trailing: IconButton(
                        icon: Icon(Icons.open_in_browser),
                        onPressed: _openActivationWebsite,
                      ),
                    ),
                    
                    ListTile(
                      leading: Icon(Icons.looks_3, color: Colors.blue),
                      title: Text('Paste code and get device key'),
                    ),
                    
                    ListTile(
                      leading: Icon(Icons.looks_4, color: Colors.blue),
                      title: Text('Enter device key below'),
                    ),
                  ],
                ),
              ),
            ),
            
            SizedBox(height: 20),
            
            TextField(
              decoration: InputDecoration(
                labelText: 'Enter Device Key',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.vpn_key),
              ),
              onChanged: (value) {
                // Store device key
                _deviceService.saveDeviceKey(value);
              },
            ),
            
            SizedBox(height: 20),
            
            if (_statusMessage.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Text(
                  _statusMessage,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: _statusMessage.contains('Error') 
                        ? Colors.red 
                        : Colors.green,
                  ),
                ),
              ),
            
            SizedBox(height: 20),
            
            ElevatedButton(
              onPressed: _isLoading ? null : _activateDevice,
              child: _isLoading
                  ? CircularProgressIndicator(color: Colors.white)
                  : Text('Activate Device'),
              style: ElevatedButton.styleFrom(
                minimumSize: Size(double.infinity, 50),
              ),
            ),
            
            SizedBox(height: 10),
            
            TextButton(
              onPressed: _generateActivationCode,
              child: Text('Generate New Code'),
            ),
          ],
        ),
      ),
    );
  }
}