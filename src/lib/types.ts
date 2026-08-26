export type Classroom = {
  id: string;
  owner_id: string;
  name: string;
  blacked_out: boolean;
  created_at: string;
};

export type Camera = {
  id: string;
  classroom_id: string;
  label: string;
  /** Image/MJPEG URL the camera publishes. Null until hardware is paired. */
  stream_url: string | null;
  /** Order the screen's "Next view" button cycles through. */
  position: number;
  created_at: string;
};
