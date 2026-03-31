import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: any;
    email: string;
    role: string;
    [key: string]: any;
  };
}
