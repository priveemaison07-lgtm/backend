export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateUser {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}
