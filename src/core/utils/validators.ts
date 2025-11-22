export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidNickname = (nickname: string): boolean => {
  const regex = /^[A-Za-z0-9!@#$%^&*()_\-=+\[\]{}:.?]+$/;
  return nickname.trim().length > 0 && regex.test(nickname);
};

export const isNonEmpty = (value: string): boolean => value.trim().length > 0;

export const validatePassword = (password: string): boolean => {
  const passwordRegex =
    /^(?=(?:.*[A-Z]){2,})(?=(?:.*[a-z]){2,})(?=(?:.*\d){2,})[A-Za-z\d!@#$%^&*\(\)\-_=+\[\]\{\}:.\?]{6,}$/;

  return password.length >= 6 && passwordRegex.test(password);
};
