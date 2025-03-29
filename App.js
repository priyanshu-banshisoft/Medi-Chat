import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { GiftedChat, Bubble, InputToolbar, Send } from "react-native-gifted-chat";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Ionicons,FontAwesome5 } from "@expo/vector-icons";

const AI_API_KEY = "AIzaSyDD35kXvdr0Ez80QWjUsq7qvC0OdxKbVYg";

const storeAPIKey = async (key) => {
  await SecureStore.setItemAsync("AI_API_KEY", key);
};

const getStoredAPIKey = async () => {
  return await SecureStore.getItemAsync("AI_API_KEY");
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState(AI_API_KEY);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initial welcome message
    setMessages([
      {
        _id: 1,
        text: "Hi! I'm your support assistant. How can I help you today?",
        createdAt: new Date(),
        user: { _id: 2, name: "AI Assistant" },
      },
    ]);

    getStoredAPIKey().then((key) => {
      if (key) setApiKey(key);
      else storeAPIKey(AI_API_KEY);
      setLoading(false);
    });
  }, []);

  const sendMessageToAI = async (text) => {
    try {
      setIsTyping(true);
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        { contents: [{ parts: [{ text }] }] },
        { params: { key: apiKey } }
      );
      return response.data.candidates[0]?.content?.parts[0]?.text || "I'm sorry, I couldn't understand that.";
    } catch (error) {
      console.error("AI API Error:", error);
      setError("Sorry, I'm having trouble connecting. Please try again later.");
      return null;
    } finally {
      setIsTyping(false);
    }
  };

  const onSend = useCallback(async (newMessages = []) => {
    const userMessage = newMessages[0];
    setMessages(prev => GiftedChat.append(prev, newMessages));

    const aiResponse = await sendMessageToAI(userMessage.text);
    if (aiResponse) {
      const botMessage = {
        _id: Math.random().toString(),
        text: aiResponse,
        createdAt: new Date(),
        user: { _id: 2, name: "AI Assistant" },
      };
      setMessages(prev => GiftedChat.append(prev, [botMessage]));
    }
  }, []);

  // UI Components
  const renderBubble = (props) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: {
          backgroundColor: "#007AFF",
          marginVertical: 4,
          borderRadius: 12,
        },
        left: {
          backgroundColor: "#E5E5EA",
          marginVertical: 4,
          borderRadius: 12,
        },
      }}
      textStyle={{
        right: { color: "white" },
        left: { color: "black" },
      }}
    />
  );

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
    <View style={styles.footerContainer}>
      {isTyping && <Text style={styles.typingText}>AI is typing...</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
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
    backgroundColor: "#F8F9FA",
  },
  inputContainer: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    padding: 8,
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
});