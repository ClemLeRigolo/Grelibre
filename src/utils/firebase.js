import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import "firebase/storage";
import "firebase/analytics";
import { filterpost } from "./helpers";


export function initialize() {
  // Initialize Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyDl4YowSkJkBDw9vS8-WB6-V5Ftod2Pyig",
    authDomain: "grelibre-a212b.firebaseapp.com",
    projectId: "grelibre-a212b",
    storageBucket: "grelibre-a212b.firebasestorage.app",
    messagingSenderId: "130802023490",
    appId: "1:130802023490:web:3a1cd3d0d1f3d1806f81db",
    measurementId: "G-0PYQWBEXXH",
    databaseURL: "https://grelibre-a212b-default-rtdb.europe-west1.firebasedatabase.app/",
  };
  if (window.location.hostname === "localhost"
    && window.location.port === "3000") {
    // si on est en local host, on utilise un emulateur
    // cette fonction doit se faire absolument ici (sinon, il n'y pas d'écrasement dans les paramètres)
    firebaseConfig.databaseURL = "http://localhost:9000/?ns=easy-np";
  }
  const app = firebase.initializeApp(firebaseConfig);
  //initialise analytics
  firebase.analytics();
  return app;
}

export function localHost() {
  if (window.location.hostname === "localhost" && window.location.port === "3000") {
    // il faut d'abord initilizer avant de changer le comportement de cette fonction
    firebase.auth().useEmulator("http://localhost:9099");
  }
}

export function attachAuthListener(handler) {
  return firebase.auth().onAuthStateChanged(user => {
    handler(user);
  });
}

export async function getValueFromDataBase() {
  const database = firebase.database();
  const postRef = database.ref('test');
  const snapshot = await postRef.once('value');
  const post = snapshot.val();
  if (!post) {
    return [];
  }
  return Object.values(post)[0].comments ? Object.values(post)[0].comments : [];
}

export async function createNewUser(email, password, surname, name) {
  return firebase.auth().createUserWithEmailAndPassword(email, password)
  .then((userCredential) => {
    const user_temp = userCredential.user;

    // Maintenant, vous pouvez ajouter les données personnelles supplémentaires à la base de données Firebase.
    const userData = {
      surname: surname,
      name: name,
      email: email,
      password: password,
      tag: name + "_" + surname,
      id: user_temp.uid,
    };

    // Obtenez une référence à la base de données en temps réel
    const database = firebase.database();
    const userRef = database.ref('users/' + user_temp.uid);
    userRef.set(userData);
    user_temp.sendEmailVerification();
  });
}

export async function signIn(email, password) {
  await firebase.auth().signInWithEmailAndPassword(email, password);
  //add password to the list in the db
  const user = firebase.auth().currentUser;
  const database = firebase.database();
  const userRef = database.ref('users/' + user.uid);
  //add an attribute newPassword to the user that is a list
  let newPassword = [];
  newPassword.push(password);
  userRef.update({ newPassword: newPassword });
}

export async function signOut() {
  await firebase.auth().signOut();
}

export async function resetPassword(email) {
  await firebase.auth().sendPasswordResetEmail(email);
}


export async function resendMail() {
  const user = firebase.auth().currentUser;
  await user.sendEmailVerification();
}

export async function getUserData(email) {
  const database = firebase.database();
  const userRef = database.ref('users');
  console.log(userRef);
  console.log(email)
  const snapshot = await userRef.orderByChild('email').equalTo(email).once('value');
  if (!snapshot.val()) {
    return [];
  }
  return Object.values(snapshot.val())[0];
}

export async function getUserDataById(uid) {
  const database = firebase.database();
  const userRef = database.ref('users/' + uid);
  const snapshot = await userRef.once('value');
  return snapshot.val();
}

export async function updateUserData(surname, name, tag) {
  const user = firebase.auth().currentUser;
  const database = firebase.database();
  const userRef = database.ref('users/' + user.uid);
  //get the user data
  const snapshot = await userRef.once('value');
  const userTemp = snapshot.val();
  //update the user data
  if (surname !== undefined)
    userTemp.surname = surname;
  if (name !== undefined)
  userTemp.name = name;
  if (tag !== undefined)
  userTemp.tag = tag;
  userRef.set(userTemp);
}