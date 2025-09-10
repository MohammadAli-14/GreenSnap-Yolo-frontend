import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import styles from "../../assets/styles/create.styles";
import { Ionicons } from "@expo/vector-icons";
import COLORS from '../../constants/colors';
import * as ImagePicker from "expo-image-picker";
import * as Location from 'expo-location';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import useAuthStore from '../../store/authStore';
import { API_URL } from '../../constants/api';
import { Buffer } from 'buffer';

export default function CreateComplaint() {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [address, setAddress] = useState("");
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null);
  const [photoTimestamp, setPhotoTimestamp] = useState(null);
  const [reportType, setReportType] = useState('standard'); 
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationMessage, setVerificationMessage] = useState(null);
  const [classificationResult, setClassificationResult] = useState(null);
  const router = useRouter();
  const { token } = useAuthStore();

  useEffect(() => {
    (async () => {
      const [locationStatus, cameraStatus] = await Promise.all([
        Location.requestForegroundPermissionsAsync(),
        ImagePicker.requestCameraPermissionsAsync()
      ]);
      
      if (locationStatus.status !== 'granted') {
        Alert.alert(
          'Location Permission', 
          'Location access is required for accurate reporting'
        );
      }
      
      if (cameraStatus.status !== 'granted') {
        Alert.alert(
          'Camera Permission', 
          'Camera access is required to take photos of waste'
        );
      }
    })();
  }, []);
    
  const captureLocation = async () => {
    try {
      setLocationLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000
      });

      setLocationCoords(location.coords);

      const geocode = await Location.reverseGeocodeAsync(location.coords);
      if (geocode.length > 0) {
        const firstResult = geocode[0];
        const addressParts = [
          firstResult.name,
          firstResult.street,
          `${firstResult.city}, ${firstResult.region} ${firstResult.postalCode}`,
          firstResult.country
        ].filter(Boolean);
        
        setAddress(addressParts.join('\n'));
      }
    } catch (error) {
      Alert.alert(
        "Location Error", 
        "Could not get location. Please ensure location services are enabled."
      );
      console.error("Location Error:", error);
    } finally {
      setLocationLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
        exif: true 
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        let timestamp = new Date().toISOString();

        if (asset.exif?.DateTimeOriginal) {
          try {
            const [date, time] = asset.exif.DateTimeOriginal.split(' ');
            const [year, month, day] = date.split(':');
            const [hour, minute, second] = time.split(':');
            timestamp = new Date(
              parseInt(year, 10),
              parseInt(month, 10) - 1,
              parseInt(day, 10),
              parseInt(hour, 10),
              parseInt(minute, 10),
              parseInt(second, 10)
            ).toISOString();
          } catch (e) {
            console.warn("Failed to parse EXIF date", e);
          }
        }

        const compressedImage = await manipulateAsync(
          asset.uri,
          [{ resize: { width: 640 } }],
          {
            compress: 0.7,
            format: SaveFormat.JPEG,
            base64: true
          }
        );

        if (compressedImage.base64) {
          setImage(compressedImage.uri);
          setImageBase64(compressedImage.base64);
          setPhotoTimestamp(timestamp);
          setClassificationResult(null);
        }
      }
    } catch (error) {
      console.error("Camera Error:", error);
      Alert.alert(
        "Camera Error",
        "Failed to capture photo. Please try again."
      );
    }
  };

  const validateForm = () => {
    const errors = [];
    
    if (!title.trim()) errors.push('Complaint title');
    if (!details.trim()) errors.push('Issue details');
    if (!address.trim()) errors.push('Location address');
    if (!imageBase64) errors.push('Evidence photo');
    if (!locationCoords) errors.push('GPS coordinates');
    
    return errors;
  };

  const testClassification = async () => {
    try {
      const pureBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const response = await fetch(`${API_URL}/report/test-classify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image: pureBase64 }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Service error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      setClassificationResult(result);
      
      if (result.isVerifiedWaste) {
        // Auto-submit for high confidence
        return true;
      } else if (result.isWaste) {
        return new Promise((resolve) => {
          Alert.alert(
            "Potential Waste Detected",
            `AI detected waste with ${(result.confidence * 100).toFixed(1)}% confidence.`,
            [
              { text: "Retake Photo", onPress: () => resolve(false) },
              { 
                text: "Submit Report", 
                onPress: () => resolve(true)
              }
            ]
          );
        });
      } else {
        return new Promise((resolve) => {
          Alert.alert(
            "No Waste Detected",
            "AI did not detect waste. Please capture a clear image of waste.",
            [
              { 
                text: "Retake Photo", 
                onPress: () => resolve(false) 
              }
            ]
          );
        });
      }

    } catch (error) {
      console.error("Classification test failed:", error.message);
      
      return new Promise((resolve) => {
        Alert.alert(
          "Verification Failed",
          "AI service is unavailable. Submit anyway?",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { 
              text: "Submit Report", 
              onPress: () => resolve(true)
            }
          ]
        );
      });
    }
  };

  const resetForm = () => {
    setTitle("");
    setDetails("");
    setAddress("");
    setImage(null);
    setImageBase64(null);
    setLocationCoords(null);
    setPhotoTimestamp(null);
    setReportType("standard");
    setClassificationResult(null);
    router.push("/");
  };

  const handleSubmit = async () => {
    if (!imageBase64) {
      return Alert.alert("Missing Image", "Please take a photo first");
    }

    const maxBytes = 5 * 1024 * 1024;
    const byteSize = Buffer.byteLength(imageBase64, "base64");
    if (byteSize > maxBytes) {
      return Alert.alert(
        "Image Too Large",
        `Your photo is ${(byteSize / (1024 * 1024)).toFixed(2)} MB; max is 5 MB.`
      );
    }

    const formErrors = validateForm();
    if (formErrors.length > 0) {
      return Alert.alert(
        "Missing Information",
        `Please provide: ${formErrors.join(", ")}`
      );
    }

    try {
      setLoading(true);
      setVerifying(true);
      setVerificationStatus(null);
      setVerificationMessage(null);

      const shouldProceed = await testClassification();
      if (!shouldProceed) {
        setLoading(false);
        setVerifying(false);
        return;
      }

      // Set verification message for high confidence cases
      if (classificationResult?.isVerifiedWaste) {
        setVerificationStatus("high_confidence");
        setVerificationMessage("✅ Verified waste - Submitting report...");
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      const payload = {
        title: title.trim(),
        details: details.trim(),
        address: address.trim(),
        image: imageBase64,
        latitude: locationCoords.latitude,
        longitude: locationCoords.longitude,
        photoTimestamp,
        reportType,
        classification: classificationResult
      };

      const response = await fetch(`${API_URL}/report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (responseText.startsWith("<!DOCTYPE html") || responseText.startsWith("<html")) {
        throw new Error("Server returned HTML error page");
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (response.ok) {
          Alert.alert("Success", "Report submitted successfully!");
          resetForm();
          return;
        } else {
          throw new Error(`Server returned invalid response: ${responseText.slice(0, 100)}`);
        }
      }

      if (!response.ok) {
        let errorMessage = data.message || `Server error ${response.status}`;
        
        if (data.code === "NOT_WASTE") {
          errorMessage = `AI detected: ${data.classification?.label || "Non-waste"}`;
        } else if (data.code === "LOW_CONFIDENCE") {
          errorMessage = `Confidence: ${((data.classification?.confidence ?? 0) * 100).toFixed(1)}%`;
        }
        
        throw new Error(errorMessage);
      }

      Alert.alert("Success", "Report submitted successfully!", [
        {
          text: "OK",
          onPress: resetForm
        },
      ]);

    } catch (error) {
      console.error("Submission Error:", error);
      
      let message = "Failed to submit report. Please try again later.";
      
      if (error.message.includes("HTML error page")) {
        message = "Server error. Please contact support.";
      } else if (error.message.includes("Server returned invalid response")) {
        message = "Unexpected server response. Please try again.";
      } else if (error.message) {
        message = error.message;
      }
      
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Report a Waste Issue</Text>
            <Text style={styles.subTitle}>Help keep our environment clean</Text>
          </View>

          <View style={styles.form}>
            {/* Complaint Title */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Complaint Title*</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Overflowing bin"
                  placeholderTextColor={COLORS.placeholderText}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                />
              </View>
            </View>
            
            {/* Report Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Report Type*</Text>
              <View style={styles.typeButtonsContainer}>
                <TouchableOpacity 
                  style={[
                    styles.typeButton, 
                    reportType === 'standard' && styles.typeButtonActive
                  ]}
                  onPress={() => setReportType('standard')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    reportType === 'standard' && styles.typeButtonTextActive
                  ]}>
                    Standard
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.typeButton, 
                    reportType === 'hazardous' && styles.typeButtonActive
                  ]}
                  onPress={() => setReportType('hazardous')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    reportType === 'hazardous' && styles.typeButtonTextActive
                  ]}>
                    Hazardous
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.typeButton, 
                    reportType === 'large' && styles.typeButtonActive
                  ]}
                  onPress={() => setReportType('large')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    reportType === 'large' && styles.typeButtonTextActive
                  ]}>
                    Large
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Location Group */}
            <View style={styles.formGroup}>
              <View style={styles.locationHeader}>
                <Text style={styles.label}>Location*</Text>
                <TouchableOpacity onPress={captureLocation} disabled={locationLoading}>
                  <Text style={styles.refreshLink}>
                    {locationLoading ? 'Locating...' : 'Refresh Location'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.inputContainer}
                onPress={captureLocation}
                disabled={locationLoading}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <View style={styles.locationPreview}>
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : locationCoords ? (
                    <>
                      <Text style={styles.coordinatesText}>
                        Lat: {locationCoords.latitude.toFixed(5)}
                      </Text>
                      <Text style={styles.coordinatesText}>
                        Lon: {locationCoords.longitude.toFixed(5)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.placeholderText}>Tap to capture location</Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Address - Made non-editable */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Exact Address*</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="pencil-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.textArea, styles.disabledInput]}
                  placeholder="Address will be captured automatically"
                  placeholderTextColor={COLORS.placeholderText}
                  value={address}
                  editable={false}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Photo */}
            <View style={styles.formGroup}>
              <View style={styles.photoHeader}>
                <Text style={styles.label}>Evidence Photo*</Text>
                {image && (
                  <TouchableOpacity onPress={() => { 
                    setImage(null); 
                    setImageBase64(null);
                    setClassificationResult(null);
                  }}>
                    <Text style={styles.refreshLink}>Retake</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity 
                style={styles.imagePicker} 
                onPress={takePhoto}
                disabled={loading}
              >
                {image ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: image }} style={styles.previewImage} />

                    {classificationResult && (
                      <View style={styles.classificationBadge}>
                        <Text style={styles.badgeText}>
                          {classificationResult.label} (
                          {(classificationResult.confidence * 100).toFixed(1)}%
                          )
                        </Text>
                        {classificationResult.isVerifiedWaste && (
                          <Ionicons name="checkmark-circle" size={20} color="green" />
                        )}
                      </View>
                    )}

                    {loading && (
                      <View style={styles.validationOverlay}>
                        <ActivityIndicator size="large" color={COLORS.white} />
                        <Text style={styles.validationText}>Verifying waste...</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Ionicons name="camera-outline" size={40} color={COLORS.textSecondary} />
                    <Text style={styles.placeholderText}>Tap to take photo</Text>
                    <Text style={styles.instructionText}>
                      Focus on waste items only{"\n"}
                      Avoid hands, feet, or people{"\n"}
                      Capture clear, well-lit images
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Details */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Issue Details*</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe the waste issue in detail..."
                  placeholderTextColor={COLORS.placeholderText}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  numberOfLines={5}
                  maxLength={500}
                />
              </View>
              <Text style={styles.charCounter}>
                {details.length}/500 characters
              </Text>
            </View>
            
            {/* Verifying Message */}
            {verifying && (
              <Text style={styles.verifyingText}>
                Verifying waste image...
              </Text>
            )}
            
            {/* Verification Result Message */}
            {verificationMessage && (
              <View style={styles.verificationContainer}>
                <Text style={[
                  styles.verificationText,
                  verificationStatus === 'high_confidence' && styles.verifiedSuccess,
                ]}>
                  {verificationMessage}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.button, (loading || !imageBase64) && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading || !imageBase64}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons
                    name="send-outline"
                    size={20}
                    color={COLORS.white}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>Submit Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}