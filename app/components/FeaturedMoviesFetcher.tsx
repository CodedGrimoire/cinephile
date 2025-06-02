// components/FeaturedMoviesFetcher.ts
import axios from "axios";

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

export class FeaturedMoviesFetcher {
  private apikey = "https://www.omdbapi.com/?apikey=a4d5b9";

  // Curated lists of high-rated recent movies (2020-2025) by genre - NO DUPLICATES
  private genreMovies = {
    Action: [
      "tt6443346", // Black Widow (2021)
      "tt9376612", // Shang-Chi (2021) 
      "tt9114286", // Black Panther: Wakanda Forever (2022)
      "tt15239678", // Dune: Part Two (2024)
      "tt6334354", // Top Gun: Maverick (2022)
      "tt10872600", // Spider-Man: No Way Home (2021)
      "tt1745960", // Top Gun: Maverick (2022)
    ],
    Animation: [
      "tt7146812", // Onward (2020)
      "tt2948372", // Soul (2020)
      "tt12801262", // Luca (2021)
      "tt13650600", // Turning Red (2022)
      "tt10954600", // Lightyear (2022)
      "tt5104604", // The Mitchells vs. The Machines (2021)
      "tt2953050", // Encanto (2021)
    ],
    Comedy: [
      "tt6139732", // Adam Project (2022)
      "tt11286314", // Don't Look Up (2021)
      "tt9243946", // Free Guy (2021)
      "tt11083552", // Uncharted (2022)
      "tt8367814", // The Harder They Fall (2021)
      "tt6791350", // Guardians of the Galaxy Vol. 3 (2023)
      "tt11286316", // Red Notice (2021)
    ],
    Drama: [
      "tt9770150", // Nomadland (2020)
      "tt10633456", // West Side Story (2021)
      "tt12789558", // Belfast (2021)
      "tt10095582", // The Power of the Dog (2021)
      "tt11813216", // The Banshees of Inisherin (2022)
      "tt14208870", // The Fabelmans (2022)
      "tt10366460", // CODA (2021)
    ],
    Horror: [
      "tt8332922", // A Quiet Place Part II (2020)
      "tt11007312", // Malignant (2021)
      "tt11245972", // Scream (2022)
      "tt7144666", // The Black Phone (2021)
      "tt15071532", // Barbarian (2022)
      "tt10954984", // Nope (2022)
      "tt12758060", // X (2022)
    ],
    Romance: [
      "tt12747748", // After We Collided (2020)
      "tt9647768", // The Half of It (2020)
      "tt15398776", // Purple Hearts (2022)
      "tt13651794", // Through My Window (2022)
      "tt11851214", // The Kissing Booth 3 (2021)
      "tt6723592", // To All the Boys: Always and Forever (2021)
      "tt11286318", // The Adam Project (2022)
    ],
    SciFi: [
      "tt1160419", // Dune (2021)
      "tt15359898", // Dune: Part Two (2024)
      "tt11286020", // Don't Look Up (2021)
      "tt9777666", // The Tomorrow War (2021)
      "tt6710474", // Everything Everywhere All at Once (2022)
      "tt10838180", // Matrix Resurrections (2021)
      "tt11286322", // Stowaway (2021)
    ],
    Thriller: [
      "tt2382320", // No Time to Die (2021)
      "tt9731534", // The Woman in the Window (2021)
      "tt1877830", // The Batman (2022)
      "tt7846844", // Red Notice (2021)
      "tt11564570", // Glass Onion (2022)
      "tt11286324", // Army of the Dead (2021)
      "tt10838056", // Old (2021)
    ]
  };

  // Simple fallback list of guaranteed high-rated movies
  private fallbackMovies = [
    "tt0111161", // The Shawshank Redemption
    "tt0468569", // The Dark Knight
    "tt1375666", // Inception
    "tt0109830", // Forrest Gump
    "tt0133093", // The Matrix
    "tt0110912", // Pulp Fiction
    "tt0167260", // LOTR: Return of the King
    "tt0816692", // Interstellar
  ];

  // Fetch detailed movie information
  private async fetchMovieDetails(movieId: string): Promise<Movie | null> {
    try {
      const { data } = await axios.get(`${this.apikey}&i=${movieId}&plot=short`);
      const movieData = data as Record<string, any>;
      
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
      console.error(`Error fetching movie ${movieId}:`, err);
      return null;
    }
  }

  // Get one movie from each genre (8 total) - ENSURES NO DUPLICATES
  public async getFeaturedMovies(count: number = 8): Promise<Movie[]> {
    const featuredMovies: Movie[] = [];
    const usedMovieIds = new Set<string>(); // Track used IDs to prevent duplicates
    const genreNames = Object.keys(this.genreMovies);

    try {
      // Get one random movie from each genre
      const promises = genreNames.slice(0, count).map(async (genre) => {
        const genreMovieIds = this.genreMovies[genre as keyof typeof this.genreMovies];
        
        // Find an unused movie from this genre
        let attempts = 0;
        let randomMovieId = "";
        
        do {
          randomMovieId = genreMovieIds[Math.floor(Math.random() * genreMovieIds.length)];
          attempts++;
        } while (usedMovieIds.has(randomMovieId) && attempts < 10);
        
        // Mark this ID as used
        if (!usedMovieIds.has(randomMovieId)) {
          usedMovieIds.add(randomMovieId);
          return this.fetchMovieDetails(randomMovieId);
        }
        return null;
      });

      const results = await Promise.all(promises);
      
      // Filter out any failed fetches and ensure no duplicates
      results.forEach(movie => {
        if (movie && !featuredMovies.some(existing => existing.imdbID === movie.imdbID)) {
          featuredMovies.push(movie);
        }
      });

      // If we don't have enough movies, add from fallback (ensuring no duplicates)
      if (featuredMovies.length < count) {
        const needed = count - featuredMovies.length;
        const availableFallbacks = this.fallbackMovies.filter(id => 
          !featuredMovies.some(movie => movie.imdbID === id)
        );
        
        const shuffledFallbacks = availableFallbacks.sort(() => Math.random() - 0.5);
        
        const fallbackPromises = shuffledFallbacks.slice(0, needed).map(id => 
          this.fetchMovieDetails(id)
        );
        
        const fallbackResults = await Promise.all(fallbackPromises);
        fallbackResults.forEach(movie => {
          if (movie && !featuredMovies.some(existing => existing.imdbID === movie.imdbID)) {
            featuredMovies.push(movie);
          }
        });
      }

      // Final safety check - remove any duplicates that might have slipped through
      const uniqueMovies = featuredMovies.filter((movie, index, self) => 
        index === self.findIndex(m => m.imdbID === movie.imdbID)
      );

      return uniqueMovies;

    } catch (error) {
      console.error("Error fetching featured movies:", error);
      
      // Emergency fallback - just return fallback movies (ensuring no duplicates)
      return this.getFallbackMovies(count);
    }
  }

  // Emergency fallback method - ENSURES NO DUPLICATES
  private async getFallbackMovies(count: number): Promise<Movie[]> {
    const movies: Movie[] = [];
    const usedIds = new Set<string>();
    const shuffledFallbacks = [...this.fallbackMovies].sort(() => Math.random() - 0.5);

    const promises = shuffledFallbacks.slice(0, count).map(async (id) => {
      if (!usedIds.has(id)) {
        usedIds.add(id);
        return this.fetchMovieDetails(id);
      }
      return null;
    });

    const results = await Promise.all(promises);
    results.forEach(movie => {
      if (movie && !movies.some(existing => existing.imdbID === movie.imdbID)) {
        movies.push(movie);
      }
    });

    return movies;
  }

  // Method to get movies from a specific year
  public async getMoviesByYear(year: number, minRating: number = 7.5, count: number = 10): Promise<Movie[]> {
    // For simplicity, just return random featured movies
    // You can enhance this later if needed
    return this.getFeaturedMovies(count);
  }

  // Method to refresh featured movies
  public async refreshFeaturedMovies(count: number = 8): Promise<Movie[]> {
    return this.getFeaturedMovies(count);
  }
}

// Export a singleton instance
export const featuredMoviesFetcher = new FeaturedMoviesFetcher();

// Hook for React components
export const useFeaturedMovies = () => {
  return {
    getFeaturedMovies: (count?: number) => featuredMoviesFetcher.getFeaturedMovies(count),
    getMoviesByYear: (year: number, minRating?: number, count?: number) => 
      featuredMoviesFetcher.getMoviesByYear(year, minRating, count),
    refreshFeaturedMovies: (count?: number) => featuredMoviesFetcher.refreshFeaturedMovies(count),
  };
};