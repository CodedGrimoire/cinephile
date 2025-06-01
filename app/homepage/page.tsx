"use client";
import React, { useState, useEffect } from "react";
import SearchBar from "../components/search";
import MovieCard from "../components/MovieCard";
import MovieModal from "../components/MovieModal";
import UserDropdown from "../components/UserDropdown";
import LoadingSpinner from "../components/LoadingSpinner";
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
  const [loading, setLoading] = useState(false);
  const [modalMovie, setModalMovie] = useState<Movie | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const featuredMovieIDs = [
    "tt0133093", // The Matrix
    "tt1375666", // Inception
    "tt0109830", // Forrest Gump
    "tt0110912", // Pulp Fiction
    "tt0114709", // Toy Story
    "tt0468569", // The Dark Knight
    "tt0107048", // Groundhog Day
    "tt0078748", // Alien
  ];

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

  useEffect(() => {
    const fetchFeatured = async () => {
      const movies = await Promise.all(
        featuredMovieIDs.map((id) => fetchMovieDetails(id))
      );
      setFeaturedMovies(movies);
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
        fontFamily: "Times New Roman, serif",
      }}
    >
      <div className="absolute inset-0 bg-black/30"></div>

      {/* Loading Spinner */}
      <LoadingSpinner isLoading={loading} />

      {/* Success Notification */}
      {addedMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span>{addedMessage}</span>
          </div>
        </div>
      )}

      {/* User Dropdown */}
      <UserDropdown photoURL={photoURL} />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start px-4 py-8 text-white">
        {/* Header & Search Section */}
        <div className="w-full max-w-7xl mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 px-4">
          {/* Left Side */}
          <div className="flex flex-row items-center gap-4">
            <img
              src="https://i.pinimg.com/originals/21/cd/b8/21cdb894dc262b1b668d20c64dd488cd.gif"
              alt="logo"
              className="w-24 h-24 rounded-full object-cover drop-shadow-[0_0_6px_white]"
            />
            <div>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent drop-shadow-[0_0_10px_white]">
                MovieHub
              </h1>
              <p className="text-lg md:text-xl text-white/80 mt-2 drop-shadow-[0_0_6px_white]">
                Your go-to place for movie information
              </p>
            </div>
          </div>

          {/* Right Side: Search and Button */}
          <div className="flex flex-col items-center gap-4 w-full md:w-[400px]">
            <SearchBar handleInput={handleInput} search={search} />
            <button
              onClick={() => router.push("/genre")}
              className="w-full px-6 py-3 bg-white/20 text-white backdrop-blur-md rounded-full border border-white/30 hover:bg-white/30 transition-all duration-300 hover:scale-105"
            >
              Genre Based Filtering
            </button>
          </div>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="w-full max-w-7xl mx-auto mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        )}

        {/* Featured Movies */}
        <div className="w-full max-w-7xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 md:p-8 shadow-2xl">
            <h2 className="text-1xl md:text-3xl font-bold text-white mb-6 text-center drop-shadow-[0_0_6px_white]">
              Featured Movies
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredMovies.map((movie) => (
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

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-white/60 text-sm drop-shadow-[0_0_4px_white]">
            Powered by OMDB API
          </p>
        </div>
      </div>

      {/* Movie Modal */}
      <MovieModal movie={modalMovie} onClose={handleModalClose} />
    </div>
  );
}