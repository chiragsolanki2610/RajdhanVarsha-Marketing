namespace RegisterApi.Services;

/// <summary>One line item on a receipt. Quantity/UnitPrice are nullable because we can't
/// always confidently parse them out of arbitrary cart JSON.</summary>
public record ReceiptItemData(string Name, decimal? Quantity, decimal? UnitPrice);

/// <summary>Everything ReceiptService needs to render a PDF. Deliberately decoupled from the
/// PaymentOrder EF entity so the same generator can render both the auto-built draft and any
/// admin-edited version without the service knowing about the database.</summary>
public record ReceiptData(
    int OrderId,
    string UserId,
    string CustomerName,
    string UtrNumber,
    DateTime ReceiptDate,
    List<ReceiptItemData> Items,
    decimal TotalAmount,
    decimal TotalBv,
    string? Notes
);
