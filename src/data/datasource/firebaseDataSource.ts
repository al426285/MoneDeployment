import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseApp } from "../../core/config/firebaseConfig";
import { User } from "../../domain/model/User";
import {
 
} from "firebase/auth";

const db = getFirestore(firebaseApp);

export class FirebaseDataSource {
  private userCollection = collection(db, "users");

  async updateUserProfile(userId: string, tempUser: User): Promise<void> {
    const ref = doc(db, "users", userId);
    const payload = {
      email: tempUser.getEmail(),
      nickname: tempUser.getNickname(),
    };
    await updateDoc(ref, payload);
  }

}