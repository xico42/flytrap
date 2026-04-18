// Package main is the Flytrap binary entrypoint.
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/xico42/flytrap/internal/app"
)

func main() {
	addr := ":" + port()
	handler := app.New(app.FrontendFS())

	log.Printf("flytrap listening on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("flytrap: %v", err)
	}
}

func port() string {
	if p := os.Getenv("PORT"); p != "" {
		return p
	}
	return "8080"
}
