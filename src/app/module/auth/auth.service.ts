import { HttpException, Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { User, UserDocument } from '../user/entities/user.entity';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from '@nestjs/jwt';
import * as UAParser from 'ua-parser-js';
import config from '../../config';
import sendMailer from 'src/app/helpers/sendMailer';
import { Session, SessionDocument } from '../session/entities/session.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    private readonly jwtService: jwt.JwtService,
  ) {}


  private parseDeviceInfo(userAgent: string, ip: string): string {
    const parser = new UAParser.UAParser(userAgent);
    const result = parser.getResult();
    const browser = result.browser.name ?? 'Unknown Browser';
    const os = result.os.name ?? 'Unknown OS';
    return `${browser} – ${os} – ${ip}`;
  }

  // ─── Register ────────────────────────────────────────────────────────────────
  async register(CreateAuthDto: CreateAuthDto) {
    const user = await this.userModel.findOne({ email: CreateAuthDto.email });
    if (user) throw new HttpException('User already exists', 400);

    const newUser = await this.userModel.create(CreateAuthDto);
    return newUser;
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  async login(
    loginDto: { email: string; password: string },
    res: Response,
    req: Request,
  ) {
    const user = await this.userModel
      .findOne({ email: loginDto.email })
      .select('+password');
    if (!user) throw new HttpException('User not found', 404);

    const isPasswordMatch = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordMatch) throw new HttpException('Incorrect password', 401);

    const payload = { id: user._id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: config.jwt.accessTokenSecret,
      expiresIn: config.jwt.accessTokenExpires as any,
    } as jwt.JwtSignOptions);

    const refreshToken = this.jwtService.sign(payload, {
      secret: config.jwt.refreshTokenSecret,
      expiresIn: config.jwt.refreshTokenExpires as any,
    } as jwt.JwtSignOptions);

    // Save session
    const userAgent = req.headers['user-agent'] ?? '';
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'Unknown';
    const deviceInfo = this.parseDeviceInfo(userAgent, ip);

    await this.sessionModel.create({
      userId: user._id,
      refreshToken,
      deviceInfo,
      ipAddress: ip,
      lastActive: new Date(),
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return { accessToken, user };
  }

  // ─── Logout single device ─────────────────────────────────────────────────
  async logoutDevice(userId: string, sessionId: string) {
    const session = await this.sessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    });
    if (!session) throw new HttpException('Session not found', 404);

    await this.sessionModel.findByIdAndDelete(sessionId);
    return { message: 'Logged out from device successfully' };
  }

  // ─── Logout all devices ───────────────────────────────────────────────────
  async logoutAllDevices(userId: string) {
    await this.sessionModel.deleteMany({
      userId: new Types.ObjectId(userId),
    });
    return { message: 'Logged out from all devices successfully' };
  }

  // ─── Get all active sessions ──────────────────────────────────────────────
  async getLoginDevices(userId: string) {
    const sessions = await this.sessionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ lastActive: -1 })
      .select('-refreshToken'); // never expose the token

    return sessions;
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new HttpException('Email not found', 404);

    const generateOtpNumber = Math.floor(100000 + Math.random() * 900000);

    user.otp = generateOtpNumber.toString();
    user.otpExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const html = `
      <div style="font-family: Arial; text-align: center;">
        <h2 style="color:#4f46e5;">Password Reset OTP</h2>
        <p>Your OTP code is:</p>
        <h1 style="letter-spacing:4px;">${generateOtpNumber}</h1>
        <p>This code will expire in 1 hour.</p>
      </div>
    `;

    await sendMailer(user.email, 'Reset Password OTP', html);
    return { message: 'Check your email for OTP' };
  }

  // ─── Verify OTP ───────────────────────────────────────────────────────────
  async verifyEmail(email: string, otp: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new HttpException('Invalid link', 400);
    if (user.otp !== otp) throw new HttpException('Invalid OTP', 400);
    if (!user.otpExpiry) throw new HttpException('Invalid OTP', 400);
    if (user.otpExpiry < new Date())
      throw new HttpException('OTP expired', 400);

    user.otp = undefined as any;
    user.otpExpiry = undefined as any;
    user.verifiedForget = true;
    await user.save();

    return { message: 'OTP verified successfully' };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────
  async resetPasswordChange(email: string, newPassword: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new HttpException('Invalid link', 400);
    if (!user.verifiedForget) throw new HttpException('Invalid link', 400);

    user.password = newPassword;
    user.verifiedForget = false;
    await user.save();

    return { message: 'Password reset successfully' };
  }

  // ─── Change Password ──────────────────────────────────────────────────────
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user) throw new HttpException('User not found', 404);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new HttpException('Invalid old password', 400);
    if (oldPassword === newPassword)
      throw new HttpException(
        'New password cannot be same as old password',
        400,
      );

    user.password = newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }
}
