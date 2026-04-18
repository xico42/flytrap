// Package api exposes Flytrap's HTTP API handlers.
package api

import (
	"net/http"
)

// HealthHandler returns the stub health endpoint for the walking skeleton.
// It always responds 200 with {"status":"healthy"}.
func HealthHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"healthy"}`))
	})
}
