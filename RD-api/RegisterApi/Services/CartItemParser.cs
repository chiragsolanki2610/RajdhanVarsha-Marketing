using System.Text.Json;

namespace RegisterApi.Services;

/// <summary>
/// Parses cart/receipt item JSON into a normalized list of ReceiptItemData.
/// Used both to build the initial receipt draft from the customer's original
/// CartItemsJson, and to re-read an admin's already-normalized ReceiptItemsJson —
/// the key aliases below cover both shapes.
/// </summary>
public static class CartItemParser
{
    public static List<ReceiptItemData> Parse(string? itemsJson)
    {
        var result = new List<ReceiptItemData>();

        if (string.IsNullOrWhiteSpace(itemsJson))
            return result;

        try
        {
            using var doc = JsonDocument.Parse(itemsJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array)
                return result;

            foreach (var el in doc.RootElement.EnumerateArray())
            {
                if (el.ValueKind != JsonValueKind.Object)
                    continue;

                var raw = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(el.GetRawText())
                          ?? new Dictionary<string, JsonElement>();
                var fields = new Dictionary<string, JsonElement>(raw, StringComparer.OrdinalIgnoreCase);

                var name = GetString(fields, "productName", "name", "title") ?? "Item";
                var qty = GetDecimal(fields, "quantity", "qty");
                var price = GetDecimal(fields, "price", "unitPrice", "dp", "mrp", "amount");

                result.Add(new ReceiptItemData(name, qty, price));
            }
        }
        catch (JsonException)
        {
            // Malformed JSON — caller falls back to a single summary row using the order total
        }

        return result;
    }

    private static string? GetString(Dictionary<string, JsonElement> fields, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (fields.TryGetValue(key, out var prop) && prop.ValueKind == JsonValueKind.String)
                return prop.GetString();
        }
        return null;
    }

    private static decimal? GetDecimal(Dictionary<string, JsonElement> fields, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (!fields.TryGetValue(key, out var prop))
                continue;

            if (prop.ValueKind == JsonValueKind.Number && prop.TryGetDecimal(out var num))
                return num;

            if (prop.ValueKind == JsonValueKind.String && decimal.TryParse(prop.GetString(), out var parsed))
                return parsed;
        }
        return null;
    }
}
