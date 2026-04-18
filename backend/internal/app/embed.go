package app

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distFS embed.FS

// FrontendFS returns the built frontend filesystem rooted at dist/.
// The returned FS contains index.html at its root when the frontend has been built.
func FrontendFS() fs.FS {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		panic("app: unable to sub-FS dist: " + err.Error())
	}
	return sub
}
