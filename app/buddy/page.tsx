"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UserDropdown from "../components/UserDropdown";
import LoadingSpinner from "../components/LoadingSpinner";
import MovieCard from "../components/MovieCard";
import MovieModal from "../components/MovieModal";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app, db } from "@/firebaseConfig";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

interface Movie {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
  imdbRating?: string;
  Actors?: string;
  Genre?: string;
  Plot?: string;
  [key: string]: string | number | boolean | undefined;
}

export default function BuddyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [modalMovie, setModalMovie] = useState<Movie | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setResponse("");
    setRecommendedMovies([]);
    
    try {
      console.log('Sending request to backend:', question);
      
      // Step 1: Send conversation to backend to get movie name
      const backendResponse = await fetch('https://cinebackend-jpbq.onrender.com/movie-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation: question }),
      });

      console.log('Backend response status:', backendResponse.status);

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        console.error('Backend error:', errorData);
        throw new Error(errorData.error || 'Failed to get movie recommendation');
      }

      const backendData = await backendResponse.json();
      console.log('Backend data:', backendData);
      
      const movieNames = backendData.movie;
      if (!movieNames) {
        throw new Error('No movie names returned from backend');
      }
      
      // Split the comma-separated movie names and clean them up
      const movieNameList = movieNames.split(',').map((name: string) => name.trim()).filter((name: string) => name.length > 0);
      console.log('Movie names to search:', movieNameList);
      
      // Step 2: Search for each movie using OMDB API
      const allMovies: Movie[] = [];
      
      for (const movieName of movieNameList) {
        try {
          const omdbResponse = await fetch(`https://www.omdbapi.com/?apikey=a4d5b9&s=${encodeURIComponent(movieName)}`);
          const omdbData = await omdbResponse.json();
          
          console.log(`OMDB search results for "${movieName}":`, omdbData);
          
          if (omdbData.Response === "True" && omdbData.Search && omdbData.Search.length > 0) {
            // Get detailed information for the first (most relevant) result
            const movie = omdbData.Search[0];
            const detailResponse = await fetch(`https://www.omdbapi.com/?apikey=a4d5b9&i=${movie.imdbID}&plot=short`);
            const detailData = await detailResponse.json();
            
            const detailedMovie = {
              Title: detailData.Title,
              Year: detailData.Year,
              imdbID: detailData.imdbID,
              Type: detailData.Type,
              Poster: detailData.Poster,
              imdbRating: detailData.imdbRating,
              Actors: detailData.Actors,
              Genre: detailData.Genre,
              Plot: detailData.Plot,
            };
            
            // Only add if not already in the list (avoid duplicates)
            if (!allMovies.some(existing => existing.imdbID === detailedMovie.imdbID)) {
              allMovies.push(detailedMovie);
            }
          }
        } catch (error) {
          console.error(`Error searching for "${movieName}":`, error);
        }
      }
      
      if (allMovies.length > 0) {
        setRecommendedMovies(allMovies);
        setResponse(`Based on your request "${question}", I found these movies: ${movieNameList.join(', ')}`);
      } else {
        setResponse(`I couldn't find any movies related to "${movieNames}". Try asking about a different movie or genre.`);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setResponse(`Sorry, I encountered an error: ${errorMessage}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMovieClick = (movie: Movie) => {
    setModalMovie(movie);
  };

  const handleModalClose = () => {
    setModalMovie(null);
  };

  const addToList = async (movie: Movie) => {
    if (!userId) {
      setAddedMessage("Please log in to add movies to your watchlist.");
      setTimeout(() => setAddedMessage(null), 3000);
      return;
    }

    const userDoc = doc(db, "watchlists", userId);

    try {
      const snapshot = await getDoc(userDoc);
      if (!snapshot.exists()) {
        await setDoc(userDoc, { movies: [movie] });
      } else {
        await updateDoc(userDoc, {
          movies: arrayUnion(movie),
        });
      }
      setAddedMessage(`${movie.Title} has been added to your watchlist!`);
      setTimeout(() => setAddedMessage(null), 3000);
    } catch (error) {
      console.error("Error saving to Firestore:", error);
      setAddedMessage("Failed to add movie to watchlist. Please try again.");
      setTimeout(() => setAddedMessage(null), 3000);
    }
  };

  // Effects
  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        backgroundImage: `url('https://universesandbox.com/blog/wp-content/uploads/2022/05/Constellations-Feature-GIF.gif')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Enhanced backdrop overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-purple-900/20 to-blue-900/30"></div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse" style={{top: '15%', left: '10%', animationDelay: '0s'}}></div>
        <div className="absolute w-2 h-2 bg-blue-300/20 rounded-full animate-pulse" style={{top: '25%', left: '85%', animationDelay: '1.5s'}}></div>
        <div className="absolute w-1 h-1 bg-purple-300/40 rounded-full animate-pulse" style={{top: '70%', left: '15%', animationDelay: '3s'}}></div>
        <div className="absolute w-3 h-3 bg-white/20 rounded-full animate-pulse" style={{top: '85%', left: '75%', animationDelay: '4.5s'}}></div>
      </div>

      {/* Loading Spinner */}
      <LoadingSpinner isLoading={isLoading} />

      {/* Success Notification */}
      {addedMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-md animate-bounce">
          <div className="flex items-center gap-3">
            <span className="text-xl">✨</span>
            <span className="font-medium">{addedMessage}</span>
          </div>
        </div>
      )}

      {/* User Dropdown */}
      <UserDropdown photoURL={null} />

      <div className="relative z-10 min-h-screen flex flex-col items-center px-4 text-white">
        
        {/* Header - Left Aligned */}
        <div className="w-full max-w-4xl mx-auto pt-8 pb-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl ring-4 ring-white/20 backdrop-blur-sm">
                <span className="text-2xl md:text-3xl">🤖</span>
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent"></div>
            </div>
            
            <div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl tracking-tight">
                Movie Buddy
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-blue-400 to-purple-400 mt-2 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="w-full max-w-4xl mx-auto mb-16">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8 md:p-12 shadow-2xl">

            {/* Chat Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (question.trim() && !isLoading) {
                          handleSubmit(e as any);
                        }
                      }
                    }}
                    placeholder="Ask your movie buddy anything... (Press Enter to submit)"
                    className="w-full h-16 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-white placeholder-white/50 resize-none focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-300"
                    disabled={isLoading}
                  />
                  <div className="absolute bottom-4 right-4 text-white/40 text-sm">
                    {question.length}/500
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading || !question.trim()}
                  className="h-16 px-6 bg-gradient-to-r from-green-500/80 to-blue-500/80 hover:from-green-600/90 hover:to-blue-600/90 text-white backdrop-blur-md rounded-2xl border border-white/30 hover:border-white/50 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-green-500/25 font-semibold text-lg flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="text-xl group-hover:rotate-12 transition-transform duration-300">🚀</span>
                  {isLoading ? "Thinking..." : "Ask"}
                  <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                </button>
              </div>
            </form>

            {/* Response Display */}
            {response && (
              <div className="mt-8 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🤖</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Movie Buddy</h3>
                    <p className="text-white/90 leading-relaxed">{response}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recommended Movies Display */}
            {recommendedMovies.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-white mb-6 text-center">Recommended Movies</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendedMovies.map((movie, index) => (
                    <div key={`${movie.imdbID}-${index}`}>
                      <MovieCard
                        movie={movie}
                        onMovieClick={handleMovieClick}
                        onAddToList={addToList}
                        showAddButton={true}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}



            {/* Example Questions */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-white mb-4 text-center">Try these questions:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  "What's a good movie for date night?",
                  "Recommend me something like The Matrix",
                  "What are the best movies of 2024?",
                  "I want to watch a thriller, any suggestions?",
                  "What should I watch if I liked Inception?",
                  "Tell me about classic sci-fi movies"
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setQuestion(example)}
                    className="p-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:border-white/40 transition-all duration-300 text-white/80 hover:text-white text-left text-sm"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-4xl mx-auto pb-12">
          <div className="text-center bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl">🤖</span>
              <p className="text-white/80 text-lg font-medium">
                AI-Powered Movie Recommendations
              </p>
            </div>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto"></div>
            <p className="text-white/60 text-sm mt-4">
              Get personalized movie suggestions and insights
            </p>
          </div>
        </div>
      </div>

      {/* Movie Modal */}
      <MovieModal movie={modalMovie} onClose={handleModalClose} />
    </div>
  );
}
