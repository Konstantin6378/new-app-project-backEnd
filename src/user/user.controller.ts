import { Auth } from 'src/auth/decorators/auth.decorator'
import { UserService } from './user.service'
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	NotFoundException,
	Param,
	Put,
	Query,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common'
import { User } from './decorators/user.decorator'
import { UpdateDto } from './dto/update.dto'
import { IdValidationPipe } from 'src/pipes/id.validation.pipe'
import { Types } from 'mongoose'
import { UserModel } from './user.model'

@Controller('users')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Get('profile')
	@Auth()
	async getProfile(@User('_id') _id: string) {
		return this.userService.byId(_id)
	}

	@UsePipes(new ValidationPipe())
	@Put('profile')
	@HttpCode(200)
	@Auth()
	async updateProfile(@User('_id') _id: string, @Body() dto: UpdateDto) {
		return this.userService.updateProfile(_id, dto)
	}

	@Get('profile/favorites')
	@Auth()
	async getFavorites(@User('_id') _id: Types.ObjectId) {
		return this.userService.getFavoriteMovies(_id)
	}

	// @UsePipes(new ValidationPipe())
	@Put('profile/favorites')
	@HttpCode(200)
	@Auth()
	async toggleFavorite(
		@User() user: UserModel,
		@Body('movieId', IdValidationPipe) movieId: Types.ObjectId
	) {
		return this.userService.toggleFavorite(movieId, user)
	}

	@Get('count')
	@Auth('admin')
	async getCountUsers() {
		return this.userService.getCount()
	}

	@Get()
	@Auth('admin')
	async getUsers(@Query('searchTerm') searchTerm?: string) {
		return this.userService.getAll(searchTerm)
	}

	@Delete(':id')
	@Auth('admin')
	async delete(@Param('id', IdValidationPipe) id: string) {
		return this.userService.delete(id)
	}

	@UsePipes(new ValidationPipe())
	@Put(':id')
	@HttpCode(200)
	@Auth('admin')
	async updateUser(
		@Param('id', IdValidationPipe) id: string,
		@Body() dto: UpdateDto
	) {
		return this.userService.updateProfile(id, dto)
	}

	// @Get(':id')
	// @Auth('admin')
	// async getUser(@Param('id', IdValidationPipe) id: string) {
	// 	return this.userService.byId(id)
	// }
}
