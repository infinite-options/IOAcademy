import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: NextRequest) {
  try {
    const { roomName, participantName, metadata } = await req.json();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit credentials not configured" },
        { status: 500 }
      );
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName || `user-${Date.now()}`,
    });

    token.addGrant({
      room: roomName || `interview-${Date.now()}`,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    // Pass interview config as room metadata so the agent can read it
    if (metadata) {
      token.metadata = JSON.stringify(metadata);
    }

    const jwt = await token.toJwt();

    return NextResponse.json({
      token: jwt,
      url: process.env.LIVEKIT_URL,
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
