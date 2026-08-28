namespace RegisterApi.Services;

public interface IReceiptService
{
    /// <summary>
    /// Builds a receipt PDF from the given data and returns the raw PDF bytes.
    /// Used both for the auto-generated draft and any admin-edited revision —
    /// the caller decides what counts as "final" by setting ReceiptFinalized on the order.
    /// </summary>
    byte[] GenerateReceiptPdf(ReceiptData data);
}
