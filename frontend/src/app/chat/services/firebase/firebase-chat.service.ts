import { Injectable, Optional } from '@angular/core';
import { Router } from '@angular/router';
import { map, tap, switchMap, flatMap } from 'rxjs/operators';
import { Observable, combineLatest, of, merge } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User } from '../../model/user';
import { ChatBaseService } from '../chat-base.service';
import { Message } from '../../model/message';
import { Chat } from '../../model/chat';
import { ServicesConfig } from '../services-config';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root',
})
export class FirebaseChatService extends ChatBaseService {
  userDictionary = {};

  constructor(
    // private auth: FirebaseAuthService,
    private router: Router,
    @Optional() config?: ServicesConfig
  ) {
    super(config);
  }

  getHistory(chatId: string): Observable<any> {
    return new Observable<any>();
  }

  getParticipatingChats() {
    // return this.auth.user$.pipe(
    //   switchMap(user => {
    //     const participatingChats = this.afs
    //       .collection('chats', (ref: any) =>
    //         ref.where('participants', 'array-contains', user.uid)
    //       )
    //       .snapshotChanges();
    //     return participatingChats.pipe(
    //       map((actions: any) => {
    //         return actions.map((a: any) => {
    //           const chatData: any = a.payload.doc.data();
    //           const id = a.payload.doc.id;
    //           return { id, ...chatData };
    //         });
    //       })
    //     );
    //   })
    // );
  }

  async create(): Promise<boolean> {
    // Fetch user and wait for result
    // const { uid } = await this.auth.getUser();
    const uid = 'uid';

    // Init new chat data
    const data: Chat = {
      id: '12354', // TODO generate guid
      createdAt: Date.now(),
      count: 0,
      messages: [],
      participants: [uid],
      ownerId: uid,
      typing: [],
    };

    // Add new chat data to firestore and wait for result
    // TODO save chat

    // Route to new chat in chat component
    return this.router.navigate(['chats', data.id]);
  }

  async sendIsTyping(chatId: string): Promise<void> {
    // const { uid } = await this.auth.getUser();
    const uid = 'uid';

    // if (uid) {
    //   const ref = this.afs.collection('chats').doc(chatId);
    //   return ref.update({
    //     typing: firebase.firestore.FieldValue.arrayUnion(uid)
    //   });
    // }
  }

  async deleteIsTyping(chatId: string): Promise<void> {
    // const { uid } = await this.auth.getUser();
    //
    // if (uid) {
    //   const ref = this.afs.collection('chats').doc(chatId);
    //   return ref.update({
    //     typing: firebase.firestore.FieldValue.arrayRemove(uid)
    //   });
    // }
  }

  async sendMessage(chatId: string, content: string): Promise<void> {
    // const { uid } = await this.auth.getUser();
    //
    // const data = {
    //   uid,
    //   content,
    //   createdAt: firebase.firestore.Timestamp.now()
    // };
    //
    // if (uid) {
    //   const ref = this.afs.collection('chats').doc(chatId);
    //   return ref.update({
    //     messages: firebase.firestore.FieldValue.arrayUnion(data)
    //   });
    // }
  }
  //
  async deleteMessage(chat: Chat, msg: Message) {
    // const { uid } = await this.auth.getUser();
    //
    // const ref = this.afs.collection('chats').doc(chat.id);
    // if (chat.uid === uid || msg.uid === uid) {
    //   delete msg.user;
    //   return ref.update({
    //     messages: firebase.firestore.FieldValue.arrayRemove(msg)
    //   });
    // }
  }
  //
  // buildChat(chat$: Observable<any>): Observable<any> {
  //   let chat: any;
  //
  //   return chat$.pipe(
  //     switchMap(c => {
  //       chat = c;
  //       // Get all users in the chat -> find user data since only uid is known
  //       const uids = Array.from(
  //         new Set(c.messages.map((message: any) => message.uid))
  //       );
  //       const users = this.fetchUsers(uids);
  //       return users.length ? combineLatest(users) : of([]);
  //     }),
  //     map(users => {
  //       this.buildUserDictionary(users);
  //       // Augment message data with newly fetched user data
  //       chat.messages = chat.messages.map((message: any) => {
  //         return {
  //           ...message,
  //           createdAt: moment(message.createdAt.toDate()),
  //           user: this.userDictionary[message.uid]
  //         };
  //       });
  //       return chat;
  //     })
  //   );
  // }
  //
  // private buildUserDictionary(users: unknown[]) {
  //   users.forEach(user => (this.userDictionary[(user as User).uid] = user));
  // }
  //
  // private fetchUsers(uids: unknown[]): Observable<any>[] {
  //   return uids.map(uid => this.afs.doc(`users/${uid}`).valueChanges());
  // }
  //
  // getUserById(typerId) {
  //   return this.userDictionary[typerId];
  // }
}
