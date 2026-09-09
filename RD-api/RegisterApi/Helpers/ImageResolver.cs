namespace RegisterApi.Helpers
{
    // Resolves a KYC/profile image regardless of which format it was saved in:
    //   - Legacy: a base64 data-URI string (e.g. "data:image/jpeg;base64,...")
    //   - New:    a raw byte[] + separate content-type string
    // Callers just get back a data-URI string either way, so frontend <img>
    // tags keep working unchanged for both old and new records.
    public static class ImageResolver
    {
        public static string? ToDataUri(string? legacyUrl, byte[]? newBytes, string? newContentType)
        {
            // New format takes priority if present (post-migration submissions)
            if (newBytes != null && newBytes.Length > 0)
            {
                var contentType = string.IsNullOrEmpty(newContentType) ? "image/jpeg" : newContentType;
                return $"data:{contentType};base64,{Convert.ToBase64String(newBytes)}";
            }

            // Fall back to legacy string (already a data URI, or empty)
            if (!string.IsNullOrEmpty(legacyUrl))
                return legacyUrl;

            return null;
        }
    }
}
