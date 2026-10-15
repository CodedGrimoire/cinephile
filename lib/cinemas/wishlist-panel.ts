export type WishlistCinemaMovie = {
  imdbID: string;
  Title: string;
  Year: string;
};

export type WishlistCinemaPanelState = { selectedMovie: WishlistCinemaMovie | null };
export type WishlistCinemaPanelAction =
  | { type: "open"; movie: WishlistCinemaMovie }
  | { type: "close" };

export const initialWishlistCinemaPanelState: WishlistCinemaPanelState = { selectedMovie: null };

export function wishlistCinemaPanelReducer(
  _state: WishlistCinemaPanelState,
  action: WishlistCinemaPanelAction,
): WishlistCinemaPanelState {
  return action.type === "open" ? { selectedMovie: action.movie } : initialWishlistCinemaPanelState;
}

export function cinemaMovieProps(movie: WishlistCinemaMovie) {
  return { imdbId: movie.imdbID, title: movie.Title, year: movie.Year };
}
