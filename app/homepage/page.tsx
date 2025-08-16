"use client";
import React, { useState, useEffect } from "react";
import SearchBar from "../components/search";
import MovieCard from "../components/MovieCard";
import MovieModal from "../components/MovieModal";
import UserDropdown from "../components/UserDropdown";
import LoadingSpinner from "../components/LoadingSpinner";
import { featuredMoviesFetcher } from "../components/FeaturedMoviesFetcher";
import axios from "axios";
import { useRouter } from "next/navigation";

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

interface OMDBResponse {
  Search?: Movie[];
  totalResults?: string;
  Response: string;
  Error?: string;
}

export default function Homepage() {
  const apikey = "https://www.omdbapi.com/?apikey=a4d5b9";
  const router = useRouter();
  
  // State variables
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [s, setS] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [modalMovie, setModalMovie] = useState<Movie | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setS(e.target.value);
  };

  const fetchMovieDetails = async (movie: Movie | string): Promise<Movie> => {
    try {
      const id = typeof movie === "string" ? movie : movie.imdbID;
      const { data } = await axios.get(`${apikey}&i=${id}&plot=short`);
      const movieData = data as Movie;
      return {
        Title: movieData.Title,
        Year: movieData.Year,
        imdbID: movieData.imdbID,
        Type: movieData.Type,
        Poster: movieData.Poster,
        imdbRating: movieData.imdbRating,
        Actors: movieData.Actors,
        Genre: movieData.Genre,
        Plot: movieData.Plot,
      };
    } catch (err) {
      console.error("Error fetching movie details:", err);
      return typeof movie === "string"
        ? { Title: "", Year: "", imdbID: movie, Type: "", Poster: "" }
        : movie;
    }
  };

  const search = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      setLoading(true);
      axios
        .get<OMDBResponse>(`${apikey}&s=${s}`)
        .then(async (response) => {
          const searchResults = response.data.Search || [];
          const detailedResults = await Promise.all(
            searchResults.map((movie) => fetchMovieDetails(movie))
          );
          setResults(detailedResults);
          setLoading(false);
        })
        .catch((error: unknown) => {
          console.error("Error fetching data:", error);
          setLoading(false);
        });
    }
  };

  const addToList = async (movie: Movie) => {
    if (!userId) return;
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
      setAddedMessage(`${movie.Title} has been added to your list.`);
      setTimeout(() => setAddedMessage(null), 2500);
    } catch (error) {
      console.error("Error saving to Firestore:", error);
    }
  };

  const handleMovieClick = (movie: Movie) => {
    setModalMovie(movie);
  };

  const handleModalClose = () => {
    setModalMovie(null);
  };

  // Function to refresh featured movies
  const refreshFeaturedMovies = async () => {
    setFeaturedLoading(true);
    try {
      const movies = await featuredMoviesFetcher.getFeaturedMovies(8);
      setFeaturedMovies(movies);
    } catch (error) {
      console.error("Error refreshing featured movies:", error);
    } finally {
      setFeaturedLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        if (user.photoURL) {
          setPhotoURL(user.photoURL);
        }
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch featured movies on component mount
  useEffect(() => {
    const fetchFeatured = async () => {
      setFeaturedLoading(true);
      try {
        const movies = await featuredMoviesFetcher.getFeaturedMovies(8);
        setFeaturedMovies(movies);
      } catch (error) {
        console.error("Error fetching featured movies:", error);
      } finally {
        setFeaturedLoading(false);
      }
    };
    
    fetchFeatured();
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
      <LoadingSpinner isLoading={loading} />

      {/* Enhanced Success Notification */}
      {addedMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-md animate-bounce">
          <div className="flex items-center gap-3">
            <span className="text-xl">✨</span>
            <span className="font-medium">{addedMessage}</span>
          </div>
        </div>
      )}

      {/* User Dropdown */}
      <UserDropdown photoURL={photoURL} />

      <div className="relative z-10 min-h-screen flex flex-col items-center px-4 text-white">
        
        {/* Hero Section - Perfectly Centered */}
        <div className="w-full max-w-7xl mx-auto pt-8 pb-16">
          
          {/* Main Header - Better Visual Balance */}
          <div className="flex flex-col items-center text-center mb-12 space-y-8">
            
            {/* Logo and Title Row */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="relative">
                <img
                  src="https://i.pinimg.com/originals/21/cd/b8/21cdb894dc262b1b668d20c64dd488cd.gif"
                  alt="logo"
                  className="w-20 h-20 md:w-28 md:h-28 rounded-full object-cover shadow-2xl ring-4 ring-white/20 backdrop-blur-sm"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent"></div>
              </div>
              
              <div className="text-center">
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl tracking-tight">
                  MovieHub
                </h1>
                <div className="h-1 w-24 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto mt-2 rounded-full"></div>
              </div>
            </div>

            {/* Subtitle */}
            <div className="max-w-2xl mx-auto mb-8">
              <p className="text-xl md:text-2xl text-white/90 font-light leading-relaxed drop-shadow-lg">
                Your ultimate destination for discovering, exploring, and organizing movies
              </p>
            </div>

            {/* Search Section - Centered and Enhanced */}
            <div className="w-full max-w-2xl mx-auto space-y-6">
              <div className="relative">
                <SearchBar handleInput={handleInput} search={search} />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => router.push("/genre")}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500/80 to-blue-500/80 hover:from-purple-600/90 hover:to-blue-600/90 text-white backdrop-blur-md rounded-2xl border border-white/30 hover:border-white/50 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-purple-500/25 font-semibold text-lg flex items-center gap-3 group"
                >
                  <span className="text-xl group-hover:rotate-12 transition-transform duration-300">🎭</span>
                  Genre Based Filtering
                  <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                </button>
                 <button
    onClick={() => router.push("/buddy")}
    className="px-8 py-4 bg-gradient-to-r from-purple-500/80 to-blue-500/80 hover:from-purple-600/90 hover:to-blue-600/90 text-white backdrop-blur-md rounded-2xl border border-white/30 hover:border-white/50 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-purple-500/25 font-semibold text-lg flex items-center gap-3 group"
  >
    <span className="text-xl group-hover:rotate-12 transition-transform duration-300">🎬</span>
    Ask Movie Buddy
    <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
  </button>
              </div>
              
            </div>
            
          </div>
        </div>

        {/* Search Results Section - Better Spacing */}
        {results.length > 0 && (
          <div className="w-full max-w-7xl mx-auto mb-20">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                  🔍 Search Results
                </h2>
                <div className="h-1 w-20 bg-gradient-to-r from-cyan-400 to-blue-400 mx-auto rounded-full"></div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                {results.map((movie) => (
                  <MovieCard
                    key={movie.imdbID}
                    movie={movie}
                    onMovieClick={handleMovieClick}
                    onAddToList={addToList}
                    showAddButton={true}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Featured Movies Section - Horizontal Scrollable with Dynamic Content */}
        <div className="w-full max-w-7xl mx-auto mb-16">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8 md:p-12 shadow-2xl">
            
            {/* Section Header with Refresh Button */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                  <span className="text-2xl">⭐</span>
                  <span className="text-lg font-semibold text-white/90">Featured Collection</span>
                </div>
                
                {/* Refresh Button */}
                <button
                  onClick={refreshFeaturedMovies}
                  disabled={featuredLoading}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 hover:border-white/40 transition-all duration-300 text-white/80 hover:text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh featured movies"
                >
                  <span className={`text-sm ${featuredLoading ? 'animate-spin' : ''}`}>🔄</span>
                  <span className="text-sm">Refresh</span>
                </button>
              </div>
              
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                Must-Watch Movies
              </h2>
              
              <div className="h-1 w-32 bg-gradient-to-r from-yellow-400 to-orange-400 mx-auto rounded-full mb-4"></div>
              
              
            </div>

            {/* Featured Movies Content */}
            {featuredLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white/60">Loading amazing movies...</p>
                </div>
              </div>
            ) : featuredMovies.length > 0 ? (
              <div className="relative">
                {/* Scroll Hint */}
                <div className="flex items-center justify-center gap-2 mb-4 text-white/60 text-sm">
                  <span>←</span>
                  <span>Scroll to explore</span>
                  <span>→</span>
                </div>
                
                {/* Scrollable Movies */}
                <div className="overflow-x-auto scrollbar-hide pb-4">
                  <div className="flex gap-6 min-w-max px-4">
                    {featuredMovies.map((movie, index) => (
                      <div key={`${movie.imdbID}-${index}`} className="flex-shrink-0 w-72">
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
                
                {/* Gradient Overlays for Scroll Indication */}
                <div className="absolute top-16 left-0 w-8 h-full bg-gradient-to-r from-black/20 to-transparent pointer-events-none rounded-l-3xl"></div>
                <div className="absolute top-16 right-0 w-8 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none rounded-r-3xl"></div>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎬</div>
                <p className="text-white/60 text-lg mb-4">Unable to load featured movies</p>
                <button
                  onClick={refreshFeaturedMovies}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500/80 to-blue-500/80 hover:from-purple-600/90 hover:to-blue-600/90 text-white backdrop-blur-md rounded-xl border border-white/30 transition-all duration-300 hover:scale-105"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Custom Scrollbar Styles */}
            <style jsx>{`
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}</style>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="w-full max-w-7xl mx-auto pb-12">
          <div className="text-center bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl">🎬</span>
              <p className="text-white/80 text-lg font-medium">
                Powered by OMDB API
              </p>
            </div>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto"></div>
            <p className="text-white/60 text-sm mt-4">
              Discover • Explore • Enjoy
            </p>
          </div>
        </div>
      </div>

      {/* Movie Modal */}
      <MovieModal movie={modalMovie} onClose={handleModalClose} />
    </div>
  );
}