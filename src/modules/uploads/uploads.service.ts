import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

type UploadFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {}

  async uploadImage(file: UploadFile, folder?: string) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException('Cloudinary credentials are missing');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const targetFolder = folder?.trim() || 'sadad';
    const signatureBase = `folder=${targetFolder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(signatureBase).digest('hex');

    const formData = new FormData();
    const bytes = new Uint8Array(file.buffer);
    formData.append('file', new Blob([bytes], { type: file.mimetype }), file.originalname);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', targetFolder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.secure_url) {
      throw new BadRequestException(body?.error?.message ?? 'Failed to upload image');
    }

    return {
      url: body.secure_url as string,
      publicId: body.public_id as string,
      width: body.width as number | undefined,
      height: body.height as number | undefined,
      bytes: body.bytes as number | undefined,
      originalFilename: file.originalname,
    };
  }
}
