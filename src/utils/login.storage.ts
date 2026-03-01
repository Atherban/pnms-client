import AsyncStorage from "@react-native-async-storage/async-storage";

const IDENTIFIER_KEY = "last_login_identifier";

export const saveLastEmail = async (email: string) => {
  await AsyncStorage.setItem(IDENTIFIER_KEY, email);
};

export const getLastEmail = async () => {
  return AsyncStorage.getItem(IDENTIFIER_KEY);
};
