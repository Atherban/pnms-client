import AsyncStorage from "@react-native-async-storage/async-storage";

const EMAIL_KEY = "last_login_email";

export const saveLastEmail = async (email: string) => {
  await AsyncStorage.setItem(EMAIL_KEY, email);
};

export const getLastEmail = async () => {
  return AsyncStorage.getItem(EMAIL_KEY);
};
