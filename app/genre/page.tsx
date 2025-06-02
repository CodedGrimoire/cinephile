"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { db, auth } from "@/firebaseConfig";
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const allGenres = [
  "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Fantasy", "Film-Noir", "History",
  "Horror", "Music", "Musical", "Mystery", "Romance", "Sci-Fi", "Sport",
  "Thriller", "War", "Western", "Reality-TV", "Short", "Talk-Show", "Game-Show",
  "Superhero", "Detective", "Classic", "Survival", "Cyberpunk", "Psychological",
];

interface Movie {
  Title: string;
  Year: string;
  imdbID: string;
  Poster: string;
  Genre?: string;
  imdbRating?: string;
  Plot?: string;
  Actors?: string;
  Director?: string;
  Runtime?: string;
  Released?: string;
  Country?: string;
  Language?: string;
  Awards?: string;
}

export default function GenrePage() {
  const router = useRouter();
  const apikey = "https://www.omdbapi.com/?apikey=a4d5b9";

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
    });
    return () => unsubscribe();
  }, []);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const clearGenres = () => {
    setSelectedGenres([]);
    setMovies([]);
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

  const fetchMoviesByGenre = async () => {
    if (selectedGenres.length === 0) return;
    setLoading(true);

    try {
      const queries = await Promise.all(
        selectedGenres.map((genre) => axios.get(`${apikey}&s=${genre}`))
      );

      const results = (
        await Promise.all(
          queries
            .map((res) => (res.data as { Search?: any[] }).Search || [])
            .flat()
            .map(async (movie: any) => {
              const { data } = await axios.get(`${apikey}&i=${movie.imdbID}`);
              return data;
            })
        )
      ).filter((m) =>
        selectedGenres.some((g) =>
          (m as Movie).Genre?.toLowerCase().includes(g.toLowerCase())
        )
      );

      setMovies(results as Movie[]);
    } catch (err) {
      console.error("Failed to fetch genre movies:", err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMovie(null);
  };

  useEffect(() => {
    fetchMoviesByGenre();
  }, [selectedGenres]);

  // Close modal when clicking outside or pressing Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden text-white"
      style={{
        backgroundImage: `url('https://media.tenor.com/bZEUn3ywcQQAAAAM/stormcastle-count-down.gif')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        fontFamily: "Times New Roman, serif",
      }}
    >
      {/* Enhanced backdrop with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-purple-900/30 to-blue-900/40 backdrop-blur-sm"></div>
      
      {/* Animated particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse" style={{top: '10%', left: '15%', animationDelay: '0s'}}></div>
        <div className="absolute w-1 h-1 bg-blue-300/30 rounded-full animate-pulse" style={{top: '20%', left: '80%', animationDelay: '1s'}}></div>
        <div className="absolute w-3 h-3 bg-purple-300/20 rounded-full animate-pulse" style={{top: '60%', left: '10%', animationDelay: '2s'}}></div>
        <div className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse" style={{top: '80%', left: '70%', animationDelay: '3s'}}></div>
      </div>

      {/* Movie Detail Modal */}
      {isModalOpen && selectedMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={closeModal}
          ></div>
          
          <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform animate-in zoom-in-95 duration-300">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full border border-white/30 flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
            >
              ✕
            </button>

            <div className="p-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Movie Poster */}
                <div className="flex-shrink-0">
                  <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                    <img
                      src={selectedMovie.Poster !== "N/A" ? selectedMovie.Poster : "/placeholder.png"}
                      alt={selectedMovie.Title}
                      className="w-full lg:w-80 h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  </div>
                </div>

                {/* Movie Details */}
                <div className="flex-1 space-y-6">
                  {/* Title and Rating */}
                  <div>
                    <h1 className="text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                      {selectedMovie.Title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm border border-white/20">
                        <span className="text-yellow-400 text-lg">⭐</span>
                        <span className="text-yellow-300 font-bold text-lg">{selectedMovie.imdbRating || "N/A"}</span>
                      </div>
                      <div className="bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm border border-white/20">
                        <span className="text-white/90 font-medium">{selectedMovie.Year}</span>
                      </div>
                      {selectedMovie.Runtime && (
                        <div className="bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm border border-white/20">
                          <span className="text-white/90 font-medium">🕒 {selectedMovie.Runtime}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Plot */}
                  {selectedMovie.Plot && selectedMovie.Plot !== "N/A" && (
                    <div className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
                      <h3 className="text-xl font-bold mb-3 text-blue-200">📖 Plot</h3>
                      <p className="text-white/90 leading-relaxed text-lg">{selectedMovie.Plot}</p>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedMovie.Genre && (
                      <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                        <h4 className="text-sm font-bold text-purple-200 mb-2">🎭 GENRES</h4>
                        <p className="text-white/90">{selectedMovie.Genre}</p>
                      </div>
                    )}
                    
                    {selectedMovie.Director && selectedMovie.Director !== "N/A" && (
                      <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                        <h4 className="text-sm font-bold text-purple-200 mb-2">🎬 DIRECTOR</h4>
                        <p className="text-white/90">{selectedMovie.Director}</p>
                      </div>
                    )}
                    
                    {selectedMovie.Actors && selectedMovie.Actors !== "N/A" && (
                      <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                        <h4 className="text-sm font-bold text-purple-200 mb-2">🎭 CAST</h4>
                        <p className="text-white/90">{selectedMovie.Actors}</p>
                      </div>
                    )}
                    
                    {selectedMovie.Released && selectedMovie.Released !== "N/A" && (
                      <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                        <h4 className="text-sm font-bold text-purple-200 mb-2">📅 RELEASED</h4>
                        <p className="text-white/90">{selectedMovie.Released}</p>
                      </div>
                    )}
                    
                    {selectedMovie.Country && selectedMovie.Country !== "N/A" && (
                      <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                        <h4 className="text-sm font-bold text-purple-200 mb-2">🌍 COUNTRY</h4>
                        <p className="text-white/90">{selectedMovie.Country}</p>
                      </div>
                    )}
                    
                    {selectedMovie.Language && selectedMovie.Language !== "N/A" && (
                      <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                        <h4 className="text-sm font-bold text-purple-200 mb-2">🗣️ LANGUAGE</h4>
                        <p className="text-white/90">{selectedMovie.Language}</p>
                      </div>
                    )}
                  </div>

                  {/* Awards */}
                  {selectedMovie.Awards && selectedMovie.Awards !== "N/A" && (
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl p-6 backdrop-blur-sm border border-yellow-300/20">
                      <h3 className="text-xl font-bold mb-3 text-yellow-200">🏆 Awards & Recognition</h3>
                      <p className="text-white/90 leading-relaxed">{selectedMovie.Awards}</p>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        addToList(selectedMovie);
                        closeModal();
                      }}
                      className="w-full px-6 py-4 text-lg bg-gradient-to-r from-cyan-500/80 to-blue-500/80 hover:from-cyan-600/90 hover:to-blue-600/90 rounded-2xl text-white font-bold transition-all duration-300 transform hover:scale-105 backdrop-blur-md border border-cyan-300/30 shadow-lg hover:shadow-cyan-500/30 flex items-center justify-center gap-3 group"
                    >
                      <span className="transition-transform duration-300 group-hover:rotate-12 text-xl">✨</span>
                      Add to My Watchlist
                      <span className="transition-transform duration-300 group-hover:translate-x-1 text-xl">→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center">
            <span className="loader"></span>
            <p className="mt-4 text-white/80 animate-pulse">Discovering movies...</p>
          </div>
          <style>{`
            .loader {
              position: relative;
              width: 100px;
              height: 100px;
              border: 24px solid rgba(255,255,255,0.1);
              border-top: 24px solid #8B5CF6;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            .loader::after {
              content: '';
              position: absolute;
              top: -24px;
              left: -24px;
              right: -24px;
              bottom: -24px;
              border: 24px solid transparent;
              border-top: 24px solid #06B6D4;
              border-radius: 50%;
              animation: spin 1.5s linear infinite reverse;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {addedMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-3 rounded-full shadow-2xl border border-white/20 backdrop-blur-md animate-bounce">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            {addedMessage}
          </div>
        </div>
      )}

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Enhanced header with glassmorphism */}
        <div className="text-center mb-8 p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl">
            Genre Based Filtering
          </h1>
          <p className="text-white/90 text-lg leading-relaxed max-w-2xl mx-auto">
            ✨ Click genres below to discover movies that match your unique taste ✨
          </p>
        </div>

        {/* Enhanced genre buttons with better glassmorphism */}
        <div className="flex flex-wrap gap-3 mb-8 max-w-6xl mx-auto justify-center p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          {allGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`text-sm px-4 py-2 rounded-full border transition-all duration-300 transform hover:scale-105 whitespace-nowrap font-medium ${
                selectedGenres.includes(genre)
                  ? "bg-gradient-to-r from-purple-500/80 to-blue-500/80 text-white border-white/40 shadow-lg backdrop-blur-md"
                  : "bg-white/10 text-white/90 border-white/20 hover:bg-white/20 hover:border-white/40 backdrop-blur-md"
              }`}
            >
              {genre}
            </button>
          ))}
          <button
            onClick={clearGenres}
            className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-red-500/70 to-pink-500/70 hover:from-red-600/80 hover:to-pink-600/80 transition-all duration-300 transform hover:scale-105 text-white backdrop-blur-md border border-red-300/30 shadow-lg font-medium"
          >
            ❌ Clear All
          </button>
        </div>

        {/* Enhanced movie grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {movies.map((movie) => (
            <div
              key={movie.imdbID}
              className="group bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-center border border-white/20 hover:border-white/40 hover:bg-white/15 transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 shadow-2xl hover:shadow-purple-500/20 cursor-pointer"
              onClick={() => openModal(movie)}
            >
              <div className="relative overflow-hidden rounded-xl mb-4">
                <img
                  src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"}
                  alt={movie.Title}
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-white/20 backdrop-blur-md rounded-full p-3 border border-white/30">
                    <span className="text-white text-lg">👁️</span>
                  </div>
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-blue-200 transition-colors duration-300 line-clamp-2">
                {movie.Title}
              </h3>
              
              <div className="space-y-2 mb-4">
                <p className="text-white/80 font-medium">{movie.Year}</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-yellow-400 text-lg">⭐</span>
                  <span className="text-yellow-300 font-semibold">{movie.imdbRating}</span>
                </div>
                <p className="text-white/70 text-sm bg-white/5 rounded-full px-3 py-1 backdrop-blur-sm border border-white/10">
                  {movie.Genre}
                </p>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToList(movie);
                }}
                className="w-full px-4 py-3 text-sm bg-gradient-to-r from-cyan-500/80 to-blue-500/80 hover:from-cyan-600/90 hover:to-blue-600/90 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 backdrop-blur-md border border-cyan-300/30 shadow-lg hover:shadow-cyan-500/30 flex items-center justify-center gap-2 group"
              >
                <span className="transition-transform duration-300 group-hover:rotate-12">✨</span>
                Add to List
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </button>
            </div>
          ))}
        </div>

        {movies.length === 0 && !loading && selectedGenres.length > 0 && (
          <div className="text-center mt-16 p-12 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-white/80 text-xl font-medium mb-2">
              No movies found for selected genres
            </p>
            <p className="text-white/60">
              Try selecting different genres or check back later
            </p>
          </div>
        )}
        
        {movies.length === 0 && !loading && selectedGenres.length === 0 && (
          <div className="text-center mt-16 p-12 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="text-6xl mb-4">🎭</div>
            <p className="text-white/80 text-xl font-medium mb-2">
              Select genres to discover amazing movies
            </p>
            <p className="text-white/60">
              Choose from the genres above to start your cinematic journey
            </p>
          </div>
        )}
      </div>
    </div>
  );
}