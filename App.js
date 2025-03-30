import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { GiftedChat, Bubble, InputToolbar, Send } from "react-native-gifted-chat";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import * as Linking from 'expo-linking';
import {
  MED_API_KEY,
} from '@env';
const SUPPORT_EMAIL = "support@healthcare.com";
const EMERGENCY_PHONE = "1800-300-1234";
const HEALTHCARE_PHONE = "1800-300-1234";


const storeAPIKey = async (key) => {
  await SecureStore.setItemAsync("MED_API_KEY", key);
};

const getStoredAPIKey = async () => {
  return await SecureStore.getItemAsync("MED_API_KEY");
};
export default function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState(MED_API_KEY);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [quickActions] = useState([
    { title: "Symptom Check", id: "symptoms" },
    { title: "Appointment", id: "appointment" },
    { title: "Prescription", id: "prescription" },
    { title: "Emergency", id: "emergency" },
  ]);

  // Medical knowledge base
  const medicalKB = {
    symptoms: "For symptom analysis, please describe:\n1. Main symptoms\n2. Duration\n3. Severity\n4. Any existing conditions",
    appointment: "To book an appointment:\n1. Visit our Patient Portal\n2. Choose 'Schedule Visit'\n3. Select provider & time",
    prescription: "For prescription refills:\n1. Contact your pharmacy\n2. Allow 48hr processing\n3. Emergency? Call pharmacy directly",
    emergency: "EMERGENCY ASSISTANCE:\n1. Call "+EMERGENCY_PHONE+ " immediately\n2. Stay on the line\n3. Follow operator instructions\n4. Inform emergency contacts",
  };

  const handleEmergencyProtocol = async () => {
    try {
      await Linking.openURL(`tel:${EMERGENCY_PHONE}`);
    } catch (error) {
      setMessages(prev => GiftedChat.append(prev, [createMessage(
        "Failed to initiate emergency call. Please dial manually.",
        2
      )]));
    }
  };


  const handleQuickAction = async (actionId) => {
    const userMsg = { _id: Math.random(), text: medicalKB[actionId], user: { _id: 1 } };
    
    if (actionId == 'emergency') {
      handleEmergencyProtocol()
    } else {
      setMessages(prev => GiftedChat.append(prev, [userMsg]));
      const aiResponse = await sendMessageToAI(medicalKB[actionId]);
      const botMsg = createMessage(aiResponse, 2);
      setMessages(prev => GiftedChat.append(prev, [botMsg]));
    }

  };

  const sendMessageToAI = async (text) => {
    try {
      setIsTyping(true);
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          contents: [{
            parts: [
              {
                text: `You are a medical information assistant. Respond to: "${text}".

            # SAFETY RULES:
            1. NEVER diagnose/prescribe
            2. If unsure: "Consult a doctor"
            3. Use simple language (8th grade level)
            
            # RESPONSE FORMAT:
            Possible Considerations:
            • 3 general possibilities
            
            Recommended Actions:
            • 2-3 general steps
            
            Warning: ${text.includes('child') ? "Pediatric cases need urgent professional evaluation" : "Monitor symptom progression"}
            
            # EXAMPLE:
            User: "Headache and fever"
            Response: "Possible Considerations: • Viral infection • Tension headache • Dehydration
            Recommended Actions: • Rest/hydration • Monitor temperature • Consult if persists >48hrs
            This is not medical advice - always consult a healthcare provider"`
            }
          ]
          }]
        },
        { params: { key: MED_API_KEY } }
      );
      return response.data.candidates[0]?.content?.parts[0]?.text || "Please contact your healthcare provider directly for assistance.";
    } catch (error) {
      return "For immediate assistance, please call " + EMERGENCY_PHONE;
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: "Welcome to Healthcare Support. I'm your virtual medical assistant. Please remember I cannot provide diagnoses. How can I help?",
        createdAt: new Date(),
        user: { _id: 2, name: "Medical Assistant" },
      },
    ]);

    getStoredAPIKey().then((key) => {
      if (key) setApiKey(key);
      else storeAPIKey(MED_API_KEY);
      setLoading(false);
    });
  }, []);


  const renderBubble = (props) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: {
          backgroundColor: "#FFFFFF",
          marginVertical: 4,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: "#E0E0E0",
        },
        left: {
          backgroundColor: "#E8F5E9",
          marginVertical: 4,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: "#C8E6C9",
        },
      }}
      textStyle={{
        right: { color: "#2E7D32" },
        left: { color: "#1B5E20" },
      }}
    />
  );

  const renderAvatar = (props) => {
    const { currentMessage } = props;
    const isAI = currentMessage.user._id === 2;

    return (
      <View style={[
        styles.avatarContainer,
        isAI ? styles.aiAvatar : styles.userAvatar
      ]}>
        {isAI ? (
          <FontAwesome5 name="user-nurse" size={24} color="#FFFFFF" />
        ) : (
          <Ionicons name="person" size={24} color="#FFFFFF" />
        )}
      </View>
    );
  };
  const createMessage = (text, userId) => ({
    _id: Math.random(),
    text,
    createdAt: new Date(),
    user: { _id: userId, name: userId === 2 ? "AI Assistant" : "User" },
  });

  const onSend = useCallback(async (newMessages = []) => {
    const userMessage = newMessages[0];
    setMessages(prev => GiftedChat.append(prev, newMessages));

    const aiResponse = await sendMessageToAI(userMessage.text);
    const botMessage = createMessage(aiResponse, 2);
    setMessages(prev => GiftedChat.append(prev, [botMessage]));
  }, []);


  const renderInputToolbar = (props) => (
    <InputToolbar
      {...props}
      containerStyle={styles.inputContainer}
      primaryStyle={styles.inputPrimary}
    />
  );

  const renderSend = (props) => (
    <Send {...props} containerStyle={styles.sendContainer}>
      <Ionicons name="send" size={24} color="#007AFF" style={styles.sendButton} />
    </Send>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      {isTyping && <Text style={styles.typingText}>Medical Assistant is responding...</Text>}
      <Text style={styles.supportInfo}>
        For emergencies, call {EMERGENCY_PHONE} immediately.{'\n'}
        Standard response time: 24-48hrs.{'\n'}
        This is not a substitute for professional medical advice.
      </Text>
    </View>
  );
  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      {quickActions.map(action => (
        <TouchableOpacity
          key={action.id}
          style={styles.quickActionButton}
          onPress={() => handleQuickAction(action.id)}
        >
          <Text style={styles.quickActionText}>{action.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="hospital-symbol" size={24} color="#2196F3" />
        <Text style={styles.headerText}>Medical Support Assistant</Text>
      </View>

      <GiftedChat
        messages={messages}
        onSend={messages => onSend(messages)}
        user={{ _id: 1 }}
        renderBubble={renderBubble}
        renderInputToolbar={renderInputToolbar}
        renderSend={renderSend}
        renderAvatar={renderAvatar}
        renderFooter={renderFooter}
        renderQuickActions={renderQuickActions}
        placeholder="Type your message here..."
        alwaysShowSend
        scrollToBottom
        showUserAvatar
        renderAvatarOnTop
        keyboardShouldPersistTaps="handled"
        timeTextStyle={{
          left: { color: "#666" },
          right: { color: "#666" },
        }}
      />
    </View>



  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5FDFF",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E0F7FA',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  aiAvatar: {
    backgroundColor: "#2196F3",
    borderWidth: 2,
    borderColor: "#1976D2",
  },
  userAvatar: {
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#388E3C",
  },
  quickActionButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    padding: 12,
    margin: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#BBDEFB',
    backgroundColor: '#F5FDFF',
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0F7FA",
    padding: 8,
    borderRadius: 25,
    margin: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  supportInfo: {
    color: '#2196F3',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    fontWeight: '500',
  },
  typingText: {
    color: '#2196F3',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
  },
  inputContainer: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#BBDEFB",
    padding: 8,
  },
  quickActionButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    padding: 10,
    margin: 4,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  quickActionText: {
    color: '#01579B',
    fontSize: 14,
    fontWeight: '500',
  },
  supportInfo: {
    color: '#757575',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  typingText: {
    color: '#E91E63',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputPrimary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F4",
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  sendContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    paddingRight: 8,
  },
  sendButton: {
    padding: 8,
  },
  footerContainer: {
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  typingText: {
    color: "#666",
    fontSize: 14,
    fontStyle: "italic",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  quickActionButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    padding: 10,
    margin: 4,
  },
  quickActionText: {
    color: '#1976D2',
    fontSize: 14,
  },
  footer: {
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#EEE',
  },
  supportInfo: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  typingText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },
});