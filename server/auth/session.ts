import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Extended Express Request interface with userId
 */
export interface AuthenticatedRequest extends Request {
  userId?: number;
}

/**
 * Retrieves the authenticated user ID from the session
 * @param req Express request object
 * @returns User ID if authenticated, null otherwise
 */
export async function getUserFromSession(req: Request): Promise<number | null> {
  // Check for authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      // In a real implementation, you would validate the token
      // For now, we'll simulate by checking if the username exists
      const username = token;
      const user = await storage.getUserByUsername(username);
      return user ? user.id : null;
    } catch (error) {
      console.error("Error validating token:", error);
      return null;
    }
  }

  // Check for session cookie if no auth header
  // For now, we'll use a simple session cookie
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    try {
      // In a real implementation, you would validate the session
      // For now, we'll assume the session ID is the username
      const user = await storage.getUserByUsername(sessionId);
      return user ? user.id : null;
    } catch (error) {
      console.error("Error validating session:", error);
      return null;
    }
  }

  // TEMPORARY FOR DEVELOPMENT: Use a default user if no auth is provided
  // REMOVE THIS IN PRODUCTION
  return 0; // Default user ID for development
}

/**
 * Middleware to ensure a user is authenticated
 * Adds userId to request object if authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  getUserFromSession(req)
    .then(userId => {
      if (!userId && userId !== 0) { // Allow 0 for development
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Add userId to request for use in route handlers
      (req as AuthenticatedRequest).userId = userId;
      next();
    })
    .catch(error => {
      console.error("Auth error:", error);
      res.status(500).json({ message: 'Internal server error' });
    });
}
