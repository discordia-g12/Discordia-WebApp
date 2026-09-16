import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Hash, Search, Users, ArrowLeft, Send, Mic, Headphones, Compass, Plus } from 'lucide-react-native';

// ¡Importamos tus datos reales del mock!
import { USERS, SERVERS, CURRENT_USER_ID } from '../data/mock';

export default function MobileShell() {
  const [screen, setScreen] = useState('channels'); 
  const [activeServerId, setActiveServerId] = useState(SERVERS[0]?.id);

  const currentUser = USERS[CURRENT_USER_ID];
  const activeServer = SERVERS.find(s => s.id === activeServerId) || SERVERS[0];

  const renderServerRail = () => (
    <View style={styles.serverRail}>
      <TouchableOpacity 
        style={[styles.serverIcon, screen === 'home' && styles.serverIconActive]} 
        onPress={() => setScreen('home')}
      >
        <Compass color={screen === 'home' ? '#fff' : '#b5bac1'} size={24} />
      </TouchableOpacity>
      
      <View style={styles.separator} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {SERVERS.map(server => (
          <TouchableOpacity 
            key={server.id} 
            style={[styles.serverIcon, activeServerId === server.id && screen === 'channels' && styles.serverIconActive]}
            onPress={() => {
              setActiveServerId(server.id);
              setScreen('channels');
            }}
          >
            <Image source={{ uri: server.iconUrl || server.icon }} style={styles.serverImage} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addServerButton}>
          <Plus color="#23a55a" size={24} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderChannels = () => (
    <View style={styles.contentArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{activeServer?.name}</Text>
        <Search color="#b5bac1" size={20} />
      </View>
      <ScrollView style={styles.channelList}>
        {activeServer?.categories.map(cat => (
          <View key={cat.id}>
            <Text style={styles.categoryTitle}>{cat.name}</Text>
            {cat.channels.map(channel => (
              <TouchableOpacity 
                key={channel.id} 
                style={styles.channelItem}
                onPress={() => setScreen('chat')}
              >
                <Hash color="#b5bac1" size={20} />
                <Text style={styles.channelName}>{channel.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderUserPill = () => (
    <View style={styles.userPill}>
      <View style={styles.userInfo}>
        <Image source={{ uri: currentUser.avatarUrl || currentUser.avatar }} style={styles.userAvatar} />
        <View>
          <Text style={styles.userName}>{currentUser.displayName}</Text>
          <Text style={styles.userStatus}>@{currentUser.username}</Text>
        </View>
      </View>
      <View style={styles.userControls}>
        <Mic color="#b5bac1" size={20} />
        <Headphones color="#b5bac1" size={20} style={{ marginLeft: 15 }} />
      </View>
    </View>
  );

  const renderChat = () => (
    <View style={{ flex: 1, backgroundColor: '#313338' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setScreen('channels')}>
          <ArrowLeft color="#f2f3f5" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { marginLeft: 15 }]}># chat</Text>
        <View style={{ flex: 1 }} />
        <Users color="#b5bac1" size={20} />
      </View>
      <ScrollView style={{ flex: 1, padding: 15 }}>
        <Text style={{ color: '#dbdee1' }}>¡Bienvenido al chat!</Text>
      </ScrollView>
      <View style={styles.chatInputContainer}>
        <View style={styles.chatInput}>
          <Plus color="#b5bac1" size={20} />
          <Text style={{ color: '#949ba4', marginLeft: 10, flex: 1 }}>Enviar mensaje...</Text>
          <Send color="#5865f2" size={20} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1f22" />
      {screen === 'chat' ? (
        renderChat()
      ) : (
        <View style={styles.mainLayout}>
          {renderServerRail()}
          <View style={{ flex: 1 }}>
            {renderChannels()}
            {renderUserPill()}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1e1f22' },
  mainLayout: { flex: 1, flexDirection: 'row' },
  serverRail: { width: 72, backgroundColor: '#1e1f22', alignItems: 'center', paddingTop: 10, borderRightWidth: 1, borderRightColor: '#111214' },
  serverIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#313338', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  serverIconActive: { borderRadius: 16, backgroundColor: '#5865f2' },
  serverImage: { width: '100%', height: '100%', borderRadius: 16 },
  addServerButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#313338', justifyContent: 'center', alignItems: 'center' },
  separator: { width: 32, height: 2, backgroundColor: '#313338', marginVertical: 10 },
  contentArea: { flex: 1, backgroundColor: '#2b2d31' },
  header: { height: 55, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#1e1f22', backgroundColor: '#2b2d31' },
  headerTitle: { color: '#f2f3f5', fontSize: 16, fontWeight: 'bold', flex: 1 },
  channelList: { flex: 1, padding: 10 },
  categoryTitle: { color: '#949ba4', fontSize: 12, fontWeight: 'bold', marginTop: 15, marginBottom: 5, paddingHorizontal: 5 },
  channelItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 5 },
  channelName: { color: '#949ba4', fontSize: 16, marginLeft: 10, fontWeight: '500' },
  userPill: { height: 60, backgroundColor: '#232428', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, justifyContent: 'space-between' },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  userName: { color: '#f2f3f5', fontSize: 14, fontWeight: 'bold' },
  userStatus: { color: '#949ba4', fontSize: 12 },
  userControls: { flexDirection: 'row', alignItems: 'center' },
  chatInputContainer: { padding: 10, backgroundColor: '#313338' },
  chatInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#383a40', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10 }
});