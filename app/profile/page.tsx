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
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedFriendMatches, setSelectedFriendMatches] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(false);
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
 
      // Robust validation
      if (!userId || typeof userId !== "string" || userId.trim() === "") {
        console.error("Invalid userId for Firestore query:", userId);
        setLoading(false);
        return;
      }
      
      // Load basic data first (fast)
      const [userWatchlistDoc, notificationsSnapshot] = await Promise.all([
        getDoc(doc(db, "watchlists", userId)),
        userId ? getDocs(query(
          collection(db, "notifications"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        )) : Promise.resolve({ docs: [] })
      ]);
      
      // Set notifications immediately
      setNotifications(notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
      
      // Load friend requests if email available
      if (userEmail && userEmail.trim() !== "") {
        try {
          const requestsQuery = query(
            collection(db, "friendRequests"),
            where("toUserEmail", "==", userEmail),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
          );
          const requestsSnapshot = await getDocs(requestsQuery);
          setFriendRequests(requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest)));
        } catch (error) {
          console.log("Friend requests query failed, continuing without them");
          setFriendRequests([]);
        }
      }
      
      // Set loading to false for basic UI
      setLoading(false);
      
      // Load friends and movie matches in background
      setFriendsLoading(true);
      await loadFriendsAndMatches(userId, userWatchlistDoc);
      setFriendsLoading(false);

    } catch (error) {
      console.error("Error loading user data:", error);
      setLoading(false);
      setFriendsLoading(false);
    }
  };

  const loadFriendsAndMatches = async (userId: string, userWatchlistDoc: any) => {
    try {
      // Load friends
      const friendsQuery = query(
        collection(db, "friends"),
        where("userId", "==", userId)
      );
      const friendsSnapshot = await getDocs(friendsQuery);
      const friendsData: Friend[] = [];
      
      // Load friend data in parallel
      const friendPromises = friendsSnapshot.docs.map(async (friendDoc) => {
        const friendData = friendDoc.data();
        if (friendData.friendId) {
          try {
            const [friendUserDoc, friendWatchlistDoc] = await Promise.all([
              getDoc(doc(db, "users", friendData.friendId)),
              getDoc(doc(db, "watchlists", friendData.friendId))
            ]);
            
            if (friendUserDoc.exists()) {
              const friendUser = friendUserDoc.data();
              const friendWatchlist = friendWatchlistDoc.exists() ? friendWatchlistDoc.data() : { movies: [], watchedMovies: [] };
              
              return {
                id: friendDoc.id,
                uid: friendData.friendId,
                displayName: friendUser.displayName || "Unknown",
                email: friendUser.email,
                photoURL: friendUser.photoURL,
                movies: friendWatchlist.movies || [],
                watchedMovies: friendWatchlist.watchedMovies || [],
              };
            }
          } catch (error) {
            console.error("Error loading friend data:", error);
          }
        }
        return null;
      });
      
      const friendsResults = await Promise.all(friendPromises);
      const validFriends = friendsResults.filter(friend => friend !== null) as Friend[];
      setFriends(validFriends);
      
      // Calculate movie matches
      const userWatchlist = userWatchlistDoc.exists() ? userWatchlistDoc.data() : { movies: [], watchedMovies: [] };
      const userMovies = [...(userWatchlist.movies || []), ...(userWatchlist.watchedMovies || [])];
      
      const matches: {[friendId: string]: Movie[]} = {};
      validFriends.forEach(friend => {
        const friendMovies = [...friend.movies, ...friend.watchedMovies];
        const commonMovies = userMovies.filter(userMovie => 
          friendMovies.some(friendMovie => friendMovie.imdbID === userMovie.imdbID)
        );
        matches[friend.uid] = commonMovies;
      });
      setMovieMatches(matches);
      
    } catch (error) {
      console.error("Error loading friends and matches:", error);
    }
  };
  const sendFriendRequest = async () => {
    if (!inviteEmail || !user) return;
  
    try {
      // 🔎 Look up user by email
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
  
      // ✅ Fix: use Firestore doc.id as UID (not targetUser.uid)
      const targetUserDoc = usersSnapshot.docs[0];
      const targetUser = { id: targetUserDoc.id, ...targetUserDoc.data() };
  
      // 🔎 Check if already friends
      const existingFriendQuery = query(
        collection(db, "friends"),
        where("userId", "==", user.uid),
        where("friendId", "==", targetUser.id)
      );
      const existingFriendSnapshot = await getDocs(existingFriendQuery);
  
      if (!existingFriendSnapshot.empty) {
        setToast("You are already friends with this user");
        setTimeout(() => setToast(null), 3000);
        return;
      }
  
      // 🔎 Check if request already exists
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
  
      // ✅ Create friend request
      await addDoc(collection(db, "friendRequests"), {
        fromUserId: user.uid,
        fromUserEmail: user.email,
        fromUserDisplayName: user.displayName || "Unknown",
        toUserEmail: inviteEmail,
        status: "pending",
        createdAt: serverTimestamp(),
      });
  
      // ✅ Create notification for recipient (targetUser.id instead of uid)
      await addDoc(collection(db, "notifications"), {
        userId: targetUser.id,
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

      // Reload friends list in background
      loadFriendsAndMatches(user.uid, await getDoc(doc(db, "watchlists", user.uid)));
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

  const handleFriendClick = (friend: Friend) => {
    setSelectedFriend(friend);
    setSelectedFriendMatches(movieMatches[friend.uid] || []);
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage:
            "url('https://media.tenor.com/EtE11qgEtLIAAAAM/art-starry-night.gif')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="backdrop-blur-lg bg-white/10 border border-white/30 shadow-2xl rounded-2xl p-8 text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl font-semibold">Loading your profile...</p>
          <p className="text-white/70 text-sm mt-2">Setting up your friends and movie matches</p>
        </div>
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
            {friendsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
                <p className="text-white/70">Loading friends and movie matches...</p>
              </div>
            ) : friends.length === 0 ? (
              <p className="text-white/70">No friends yet. Send some invites!</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <p className="text-white/60 text-xs mb-3 px-1">💡 Click to view movie matches</p>
                {friends.map((friend) => (
                  <div 
                    key={friend.id} 
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-300 transform ${
                      selectedFriend?.uid === friend.uid 
                        ? 'bg-blue-500/30 border-2 border-blue-400 shadow-lg shadow-blue-500/20 scale-105' 
                        : 'bg-white/5 hover:bg-white/20 hover:scale-102 hover:shadow-lg hover:shadow-white/10 border border-transparent hover:border-white/20'
                    }`}
                    onClick={() => handleFriendClick(friend)}
                  >
                    <p className="text-white font-medium">{friend.email}</p>
                    {movieMatches[friend.uid] && movieMatches[friend.uid].length > 0 && (
                      <p className="text-green-400 text-xs mt-1">
                        {movieMatches[friend.uid].length} movie matches
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Send Friend Invite Section */}
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
        </div>

        {/* Right Side */}
        <div className="space-y-6">
          {/* Notifications Section - Only show if there are unread notifications */}
          {notifications.filter(n => !n.isRead).length > 0 && (
            <div className="backdrop-blur-lg bg-white/10 border border-white/30 shadow-2xl rounded-2xl p-6 text-white">
              <h2 className="text-2xl font-bold mb-4">Notifications ({notifications.filter(n => !n.isRead).length})</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.filter(n => !n.isRead).map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 rounded-lg cursor-pointer transition bg-blue-500/10 border border-blue-300/30"
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
                      <div className="w-2 h-2 bg-blue-400 rounded-full ml-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Friend Movie Matches */}
          {selectedFriend && (
            <div className="backdrop-blur-lg bg-white/10 border border-white/30 shadow-2xl rounded-2xl p-6 text-white">
              <h2 className="text-2xl font-bold mb-4">🎬 Movie Matches with {selectedFriend.email}</h2>
              {selectedFriendMatches.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    {selectedFriendMatches.map((movie) => (
                      <div key={movie.imdbID} className="bg-white/5 rounded-lg p-3">
                        <img
                          src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"}
                          alt={movie.Title}
                          className="w-full h-24 object-cover rounded mb-2"
                        />
                        <p className="text-white text-sm font-medium truncate">{movie.Title}</p>
                        <p className="text-white/60 text-xs">{movie.Year}</p>
                        {movie.Genre && (
                          <p className="text-white/50 text-xs truncate">{movie.Genre}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <p className="text-green-400 text-sm font-medium">
                      🎭 {selectedFriendMatches.length} common movies
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-white/70 text-lg">No movie matches yet</p>
                  <p className="text-white/50 text-sm mt-2">
                    Add some movies to your watchlist to find common interests!
                  </p>
                </div>
              )}
            </div>
          )}

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

