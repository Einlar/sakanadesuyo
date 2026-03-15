import QRCode from 'qrcode';

export async function generateQRSvg(url: string): Promise<string> {
    return QRCode.toString(url, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 2
    });
}
