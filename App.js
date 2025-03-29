import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { GiftedChat, Bubble, InputToolbar, Send } from "react-native-gifted-chat";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Ionicons,FontAwesome5 } from "@expo/vector-icons";

const MED_API_KEY = "AIzaSyDD35kXvdr0Ez80QWjUsq7qvC0OdxKbVYg";
const SUPPORT_EMAIL = "support@healthcare.com";
const EMERGENCY_PHONE = "108";
const HEALTHCARE_PHONE = "+1-800-300-1234";


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
    emergency: "EMERGENCY ASSISTANCE:\n1. Call 911 immediately\n2. Stay on the line\n3. Follow operator instructions\n4. Inform emergency contacts",
  };


  const handleQuickAction = async (actionId) => {
    const userMsg = { _id: Math.random(), text: medicalKB[actionId], user: { _id: 1 } };
    setMessages(prev => GiftedChat.append(prev, [userMsg]));
    
    const aiResponse = await sendMessageToAI(medicalKB[actionId]);
    const botMsg = createMessage(aiResponse, 2);
    setMessages(prev => GiftedChat.append(prev, [botMsg]));
  };

  const sendMessageToAI = async (text) => {
    try {
      setIsTyping(true);
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        { 
          contents: [{
            parts: [{
              text: `As a medical assistant, respond to: "${text}". 
              Important notes: 
              - Always advise consulting a healthcare professional
              - For emergencies, direct to call ${EMERGENCY_PHONE}
              - Never provide diagnosis, only general guidance
              - HIPAA compliant responses only
              Keep responses professional and empathetic.`
            }]
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
          backgroundColor: "#2196F3", // Medical blue
          marginVertical: 4,
          borderRadius: 12,
        },
        left: {
          backgroundColor: "#E3F2FD", // Light medical blue
          marginVertical: 4,
          borderRadius: 12,
        },
      }}
      textStyle={{
        right: { color: "white" },
        left: { color: "#01579B" }, // Dark medical blue
      }}
    />
  );

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

  const renderAvatar = (props) => {
    const { currentMessage } = props;
    const isAI = currentMessage.user._id === 2;
    
    return (
      <View style={styles.avatarContainer}>
        {isAI ? (
          <FontAwesome5 name="robot" size={24} color="#007AFF" />
        ) : (
          <Ionicons name="person" size={24} color="#007AFF" />
        )}
      </View>
    );
  };

  const renderFooter = () => (
    <View style={styles.footer}>
      {isTyping && <Text style={styles.typingText}>Medical Assistant is responding...</Text>}
      {renderQuickActions()}
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
  
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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