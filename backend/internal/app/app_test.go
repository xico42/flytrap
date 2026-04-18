package app_test

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/stretchr/testify/require"
	"github.com/xico42/flytrap/internal/app"
)

func fixtureFS() fstest.MapFS {
	return fstest.MapFS{
		"index.html":    {Data: []byte(`<!doctype html><div id="root"></div>`)},
		"assets/app.js": {Data: []byte(`console.log("flytrap");`)},
	}
}

func do(t *testing.T, h http.Handler, method, target string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(method, target, nil))
	return rec
}

func TestApp_HealthRouteServesAPI(t *testing.T) {
	rec := do(t, app.New(fixtureFS()), http.MethodGet, "/api/health")

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), `"status":"healthy"`)
}

func TestApp_UnknownAPIRouteIs404JSON(t *testing.T) {
	rec := do(t, app.New(fixtureFS()), http.MethodGet, "/api/nope")

	require.Equal(t, http.StatusNotFound, rec.Code)
	require.Equal(t, "application/json", rec.Header().Get("Content-Type"))
	require.Contains(t, rec.Body.String(), `"error":"not found"`)
}

func TestApp_RootServesIndexHTML(t *testing.T) {
	rec := do(t, app.New(fixtureFS()), http.MethodGet, "/")

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), `id="root"`)
}

func TestApp_AssetServedFromFS(t *testing.T) {
	rec := do(t, app.New(fixtureFS()), http.MethodGet, "/assets/app.js")

	require.Equal(t, http.StatusOK, rec.Code)
	body, err := io.ReadAll(rec.Body)
	require.NoError(t, err)
	require.Equal(t, `console.log("flytrap");`, string(body))
}

func TestApp_DeepLinkFallsBackToIndex(t *testing.T) {
	rec := do(t, app.New(fixtureFS()), http.MethodGet, "/messages/42")

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), `id="root"`)
}

// When dist is empty (frontend never built) the binary must still serve the API.
// Non-API requests get a clear 503 instead of a cryptic 404.
func TestApp_EmptyFSStillServesHealthAPI(t *testing.T) {
	empty := fstest.MapFS{}
	h := app.New(empty)

	rec := do(t, h, http.MethodGet, "/api/health")
	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), `"status":"healthy"`)
}

func TestApp_EmptyFSReturns503OnSPAPath(t *testing.T) {
	rec := do(t, app.New(fstest.MapFS{}), http.MethodGet, "/")
	require.Equal(t, http.StatusServiceUnavailable, rec.Code)
	require.Contains(t, rec.Body.String(), "frontend not built")
}

// Guard against accidental index.html short-circuits on API paths.
func TestApp_ApiPrefixIsNotSwallowedByFallback(t *testing.T) {
	rec := do(t, app.New(fixtureFS()), http.MethodGet, "/api/")
	require.Equal(t, http.StatusNotFound, rec.Code)
	require.Contains(t, rec.Body.String(), `"error":"not found"`)
}
