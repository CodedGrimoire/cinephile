// app/profile/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

interface Movie {
  imdbID: string;
  Title: string;
  Poster: string;
  Year: string;
  Genre?: string;
  Plot?: string;
  Actors?: string;
}

interface Friend {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  uid: string;
  movies: Movie[];
  watchedMovies: Movie[];
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  fromUserDisplayName: string;
  toUserEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}

interface Notification {
  id: string;
  type: 'friend_request' | 'movie_match' | 'friend_accepted';
  title: string;
  message: string;
  fromUserId?: string;
  fromUserDisplayName?: string;
  movieData?: Movie;
  isRead: boolean;
  createdAt: any;
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [movieMatches, setMovieMatches] = useState<{[friendId: string]: Movie[]}>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserData(currentUser.uid, currentUser.email || "");
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadUserData = async (userId: string, userEmail: string) => {
    try {
      setLoading(true);
      
      // Load friends
      const friendsQuery = query(
        collection(db, "friends"),
        where("userId", "==", userId)
      );
      const friendsSnapshot = await getDocs(friendsQuery);
      const friendsData: Friend[] = [];
      
      for (const friendDoc of friendsSnapshot.docs) {
        const friendData = friendDoc.data();
        const friendUserDoc = await getDoc(doc(db, "users", friendData.friendId));
        if (friendUserDoc.exists()) {
          const friendUser = friendUserDoc.data();
          const friendWatchlistDoc = await getDoc(doc(db, "watchlists", friendData.friendId));
          const friendWatchlist = friendWatchlistDoc.exists() ? friendWatchlistDoc.data() : { movies: [], watchedMovies: [] };
          
          friendsData.push({
            id: friendDoc.id,
            uid: friendData.friendId,
            displayName: friendUser.displayName || "Unknown",
            email: friendUser.email,
            photoURL: friendUser.photoURL,
            movies: friendWatchlist.movies || [],
            watchedMovies: friendWatchlist.watchedMovies || [],
          });
        }
      }
      setFriends(friendsData);

      // Load friend requests only if user email is available
      if (userEmail) {
        const requestsQuery = query(
          collection(db, "friendRequests"),
          where("toUserEmail", "==", userEmail),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc")
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        setFriendRequests(requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest)));
      }

      // Load notifications
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      setNotifications(notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));

      // Calculate movie matches
      const userWatchlistDoc = await getDoc(doc(db, "watchlists", userId));
      const userWatchlist = userWatchlistDoc.exists() ? userWatchlistDoc.data() : { movies: [], watchedMovies: [] };
      const userMovies = [...(userWatchlist.movies || []), ...(userWatchlist.watchedMovies || [])];
      
      const matches: {[friendId: string]: Movie[]} = {};
      friendsData.forEach(friend => {
        const friendMovies = [...friend.movies, ...friend.watchedMovies];
        const commonMovies = userMovies.filter(userMovie => 
          friendMovies.some(friendMovie => friendMovie.imdbID === userMovie.imdbID)
        );
        matches[friend.uid] = commonMovies;
      });
      setMovieMatches(matches);

    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!inviteEmail || !user) return;
    
    try {
      // Check if user exists with this email
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", inviteEmail)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        setToast("No user found with this email address");
        setTimeout(() => setToast(null), 3000);
        return;
      }

      const targetUser = usersSnapshot.docs[0].data();
      
      // Check if already friends
      const existingFriendQuery = query(
        collection(db, "friends"),
        where("userId", "==", user.uid),
        where("friendId", "==", targetUser.uid)
      );
      const existingFriendSnapshot = await getDocs(existingFriendQuery);
      
      if (!existingFriendSnapshot.empty) {
        setToast("You are already friends with this user");
        setTimeout(() => setToast(null), 3000);
        return;
      }

      // Check if request already exists
      const existingRequestQuery = query(
        collection(db, "friendRequests"),
        where("fromUserId", "==", user.uid),
        where("toUserEmail", "==", inviteEmail),
        where("status", "==", "pending")
      );
      const existingRequestSnapshot = await getDocs(existingRequestQuery);
      
      if (!existingRequestSnapshot.empty) {
        setToast("Friend request already sent");
        setTimeout(() => setToast(null), 3000);
        return;
      }

      // Create friend request
      await addDoc(collection(db, "friendRequests"), {
        fromUserId: user.uid,
        fromUserEmail: user.email,
        fromUserDisplayName: user.displayName || "Unknown",
        toUserEmail: inviteEmail,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Create notification for target user
      await addDoc(collection(db, "notifications"), {
        userId: targetUser.uid,
        type: "friend_request",
        title: "New Friend Request",
        message: `${user.displayName || user.email} wants to be your friend`,
        fromUserId: user.uid,
        fromUserDisplayName: user.displayName || "Unknown",
        isRead: false,
        createdAt: serverTimestamp(),
      });

      setToast("Friend request sent successfully!");
      setInviteEmail("");
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error sending friend request:", error);
      setToast("Error sending friend request");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const respondToFriendRequest = async (requestId: string, accepted: boolean) => {
    try {
      const request = friendRequests.find(r => r.id === requestId);
      if (!request) return;

      // Update request status
      await updateDoc(doc(db, "friendRequests", requestId), {
        status: accepted ? "accepted" : "declined",
      });

      if (accepted) {
        // Add to friends collection for both users
        await addDoc(collection(db, "friends"), {
          userId: user.uid,
          friendId: request.fromUserId,
          createdAt: serverTimestamp(),
        });

        await addDoc(collection(db, "friends"), {
          userId: request.fromUserId,
          friendId: user.uid,
          createdAt: serverTimestamp(),
        });

        // Create notification for requester
        await addDoc(collection(db, "notifications"), {
          userId: request.fromUserId,
          type: "friend_accepted",
          title: "Friend Request Accepted",
          message: `${user.displayName || user.email} accepted your friend request`,
          fromUserId: user.uid,
          fromUserDisplayName: user.displayName || "Unknown",
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }

      // Remove from local state
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
      setToast(accepted ? "Friend request accepted!" : "Friend request declined");
      setTimeout(() => setToast(null), 3000);

      // Reload friends list
      await loadUserData(user.uid, user.email || "");
    } catch (error) {
      console.error("Error responding to friend request:", error);
      setToast("Error processing friend request");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        isRead: true,
      });
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{
        backgroundImage:
          "url('https://media.tenor.com/EtE11qgEtLIAAAAM/art-starry-night.gif')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-lg shadow-lg border border-white/30">
          {toast}
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side */}
        <div className="space-y-6">
          {/* My Profile Section */}
          <div className="backdrop-blur-lg bg-white/10 border border-white/30 shadow-2xl rounded-2xl p-6 text-white">
            <h2 className="text-2xl font-bold mb-4">My Profile</h2>
            {user && (
              <div className="flex items-center space-x-4">
                <img
                  src={user.photoURL || "/globe.svg"}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-2 border-white"
                />
                <div>
                  <h3 className="text-xl font-semibold">{user.displayName || "No Name"}</h3>
                  <p className="text-white/80 text-sm">{user.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Friends List Section */}
          <div className="backdrop-blur-lg bg-white/10 border border-white/30 shadow-2xl rounded-2xl p-6 text-white">
            <h2 className="text-2xl font-bold mb-4">My Friends ({friends.length})</h2>
            {friends.length === 0 ? (
              <p className="text-white/70">No friends yet. Send some invites!</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <img
                        src={friend.photoURL || "/globe.svg"}
                        alt={friend.displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold">{friend.displayName}</p>
                        <p className="text-white/60 text-sm">{friend.email}</p>
                        {movieMatches[friend.uid] && movieMatches[friend.uid].length > 0 && (
                          <p className="text-green-400 text-xs">
                            {movieMatches[friend.uid].length} movie matches
                          </p>
                        )}
                      </div>
                    </div>
                    {movieMatches[friend.uid] && movieMatches[friend.uid].length > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-white/60">Common Movies:</div>
                        <div className="text-xs text-green-400">
                          {movieMatches[friend.uid].slice(0, 2).map(movie => movie.Title).join(", ")}
                          {movieMatches[friend.uid].length > 2 && "..."}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="space-y-6">
          {/* Send Invites Section */}
          <div className="backdrop-blur-lg bg-white/10 border border-white/30 shadow-2xl rounded-2xl p-6 text-white">
            <h2 className="text-2xl font-bold mb-4">Send Friend Invite</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter friend's email"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                />
              </div>
              <button
                onClick={sendFriendRequest}
                disabled={!inviteEmail}
                className="w-full px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-300/50 rounded-lg hover:bg-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Invite
              </button>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="backdrop-blur-lg bg-white/10 border border-white/30 shadow-2xl rounded-2xl p-6 text-white">
            <h2 className="text-2xl font-bold mb-4">Notifications ({notifications.filter(n => !n.isRead).length})</h2>
            {notifications.length === 0 ? (
              <p className="text-white/70">No notifications</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      notification.isRead ? 'bg-white/5' : 'bg-blue-500/10 border border-blue-300/30'
                    }`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold">{notification.title}</h4>
                        <p className="text-white/80 text-sm">{notification.message}</p>
                        {notification.movieData && (
                          <p className="text-green-400 text-xs mt-1">
                            Movie: {notification.movieData.Title} ({notification.movieData.Year})
                          </p>
                        )}
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full ml-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Friend Requests Section */}
          {friendRequests.length > 0 && (
            <div className="backdrop-blur-lg bg-white/10 border border-white/30 shadow-2xl rounded-2xl p-6 text-white">
              <h2 className="text-2xl font-bold mb-4">Friend Requests ({friendRequests.length})</h2>
              <div className="space-y-3">
                {friendRequests.map((request) => (
                  <div key={request.id} className="p-3 bg-white/5 rounded-lg">
                    <p className="font-semibold">{request.fromUserDisplayName}</p>
                    <p className="text-white/60 text-sm">{request.fromUserEmail}</p>
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => respondToFriendRequest(request.id, true)}
                        className="px-3 py-1 bg-green-500/20 text-green-300 border border-green-300/50 rounded text-sm hover:bg-green-500/30 transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respondToFriendRequest(request.id, false)}
                        className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-300/50 rounded text-sm hover:bg-red-500/30 transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
