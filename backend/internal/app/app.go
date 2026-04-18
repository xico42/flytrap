// Package app composes Flytrap's HTTP handler and embeds the built frontend.
package app

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/xico42/flytrap/internal/api"
)

// New composes the Flytrap HTTP handler against the supplied frontend filesystem.
// The fsys root is expected to contain index.html (the built React SPA).
// If index.html is missing (e.g. `task build:frontend` hasn't run yet),
// API routes still work; non-API requests get a clear 503 at request time,
// instead of the binary refusing to boot.
func New(fsys fs.FS) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("GET /api/health", api.HealthHandler())
	mux.HandleFunc("/api/", apiNotFound)
	mux.Handle("/", spaHandler(fsys))
	return mux
}

func apiNotFound(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotFound)
	_, _ = w.Write([]byte(`{"error":"not found"}`))
}

func spaHandler(fsys fs.FS) http.Handler {
	fileServer := http.FileServerFS(fsys)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := fs.Stat(fsys, "index.html"); err != nil {
			http.Error(w, "frontend not built — run `task build:frontend` first", http.StatusServiceUnavailable)
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			fileServer.ServeHTTP(w, r)
			return
		}
		if _, err := fs.Stat(fsys, path); err == nil {
			fileServer.ServeHTTP(w, r)
			return
		}
		// SPA deep-link fallback: serve index.html so the client router can take over.
		r2 := r.Clone(r.Context())
		r2.URL.Path = "/"
		fileServer.ServeHTTP(w, r2)
	})
}
