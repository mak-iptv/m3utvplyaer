class M3UParser {
    constructor() {
        this.playlist = [];
    }
    
    async parseFromURL(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            return this.parse(text);
        } catch (error) {
            throw new Error('Failed to load M3U from URL: ' + error.message);
        }
    }
    
    async parseFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const playlist = this.parse(e.target.result);
                    resolve(playlist);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }
    
    parse(m3uContent) {
        const lines = m3uContent.split('\n');
        const playlist = [];
        let currentEntry = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                // Nxjerr informacionin nga linja EXTINF
                currentEntry = this.parseExtinf(line);
            } else if (line.startsWith('#EXTGRP:')) {
                // Nxjerr grupin
                currentEntry.group = line.replace('#EXTGRP:', '').trim();
            } else if (line.startsWith('#EXTIMG:')) {
                // Nxjerr imazhin
                currentEntry.logo = line.replace('#EXTIMG:', '').trim();
            } else if (line.startsWith('http')) {
                // Kjo është URL e stream-it
                currentEntry.url = line;
                
                // Shto në playlist vetëm nëse ka URL
                if (currentEntry.url) {
                    playlist.push({...currentEntry});
                }
                
                // Reset për entry-n e radhës
                currentEntry = {};
            }
        }
        
        return playlist;
    }
    
    parseExtinf(extinfLine) {
        const entry = {};
        
        // Nxjerr kohëzgjatjen dhe emrin
        const matches = extinfLine.match(/#EXTINF:(-?\d+)\s*(.*)/);
        if (matches) {
            entry.duration = parseInt(matches[1]);
            const rest = matches[2];
            
            // Nxjerr metadata shtesë
            const tvgIdMatch = rest.match(/tvg-id="([^"]+)"/);
            if (tvgIdMatch) entry.tvgId = tvgIdMatch[1];
            
            const tvgNameMatch = rest.match(/tvg-name="([^"]+)"/);
            if (tvgNameMatch) entry.tvgName = tvgNameMatch[1];
            
            const tvgLogoMatch = rest.match(/tvg-logo="([^"]+)"/);
            if (tvgLogoMatch) entry.logo = tvgLogoMatch[1];
            
            const groupMatch = rest.match(/group-title="([^"]+)"/);
            if (groupMatch) entry.group = groupMatch[1];
            
            // Nxjerr emrin e kanalit (pas presjes)
            const nameMatch = rest.match(/,(.+)$/);
            if (nameMatch) entry.name = nameMatch[1].trim();
        }
        
        return entry;
    }
}
